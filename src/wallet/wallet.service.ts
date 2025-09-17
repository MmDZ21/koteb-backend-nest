import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        txns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'IRR',
        },
        include: {
          txns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    return wallet;
  }

  async getWalletTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deposit(userId: string, depositDto: DepositDto) {
    const wallet = await this.getWallet(userId);
    
    const newBalance = Number(wallet.balance) + depositDto.amount;

    // Create transaction record
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount: depositDto.amount,
        balanceAfter: newBalance,
        refType: 'DEPOSIT',
        meta: {
          paymentMethod: depositDto.paymentMethod,
          currency: depositDto.currency,
        },
      },
    });

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    return {
      message: 'Deposit successful',
      transaction,
      newBalance,
    };
  }

  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    const wallet = await this.getWallet(userId);
    
    if (Number(wallet.balance) < withdrawDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const newBalance = Number(wallet.balance) - withdrawDto.amount;

    // Create withdraw request
    const withdrawRequest = await this.prisma.withdrawRequest.create({
      data: {
        userId,
        amount: withdrawDto.amount,
        currency: withdrawDto.currency,
        bankInfo: JSON.parse(withdrawDto.bankInfo),
        status: 'PENDING',
      },
    });

    // Create transaction record
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAW',
        amount: -withdrawDto.amount,
        balanceAfter: newBalance,
        refType: 'WITHDRAW_REQUEST',
        refId: withdrawRequest.id,
        meta: {
          currency: withdrawDto.currency,
          bankInfo: JSON.parse(withdrawDto.bankInfo),
        },
      },
    });

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    return {
      message: 'Withdrawal request submitted',
      withdrawRequest,
      transaction,
      newBalance,
    };
  }

  async processWithdrawRequest(adminId: string, requestId: string, approved: boolean, adminNote?: string) {
    const request = await this.prisma.withdrawRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been processed');
    }

    const status = approved ? 'APPROVED' : 'REJECTED';
    
    const updatedRequest = await this.prisma.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status,
        adminNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // If rejected, refund the amount to wallet
    if (!approved) {
      const wallet = await this.getWallet(request.userId);
      const newBalance = Number(wallet.balance) + Number(request.amount);

      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'ADJUSTMENT',
          amount: Number(request.amount),
          balanceAfter: newBalance,
          refType: 'WITHDRAW_REJECTED',
          refId: requestId,
          meta: {
            reason: 'Withdrawal request rejected',
            adminNote,
          },
        },
      });

      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });
    }

    return updatedRequest;
  }

  async getWithdrawRequests(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.withdrawRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserWithdrawRequests(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.withdrawRequest.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawRequest.count({ where: { userId } }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
