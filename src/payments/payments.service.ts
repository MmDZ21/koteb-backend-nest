import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id: createPaymentDto.orderId },
      select: { id: true, buyerId: true, totalAmount: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if payment already exists for this order
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId: createPaymentDto.orderId },
    });

    if (existingPayment) {
      throw new BadRequestException('Payment already exists for this order');
    }

    const payment = await this.prisma.payment.create({
      data: createPaymentDto,
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                listing: {
                  include: {
                    edition: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return payment;
  }

  async getAllPayments(page: number = 1, limit: number = 20, status?: string, gateway?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (gateway) {
      where.gateway = gateway;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                listing: {
                  include: {
                    edition: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getUserPayments(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          order: {
            buyerId: userId,
          },
        },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              items: {
                include: {
                  listing: {
                    include: {
                      edition: true,
                    },
                  },
                  seller: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({
        where: {
          order: {
            buyerId: userId,
          },
        },
      }),
    ]);

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                listing: {
                  include: {
                    edition: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    return payment;
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto) {
    try {
      const payment = await this.prisma.payment.update({
        where: { id },
        data: updatePaymentDto,
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return payment;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Payment not found');
      }
      throw error;
    }
  }

  async updatePaymentStatus(id: string, status: string, paidAt?: Date) {
    const updateData: any = { status };
    if (paidAt) {
      updateData.paidAt = paidAt;
    }

    const payment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return payment;
  }

  async processPaymentSuccess(paymentId: string) {
    const payment = await this.getPaymentById(paymentId);
    
    if (payment.status === 'PAID') {
      throw new BadRequestException('Payment already processed');
    }

    // Update payment status
    const updatedPayment = await this.updatePaymentStatus(paymentId, 'PAID', new Date());

    // Update order status to PAID
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
    });

    // Process wallet transactions for sellers
    await this.processSellerPayouts(payment.orderId);

    return updatedPayment;
  }

  async processPaymentFailure(paymentId: string, reason?: string) {
    const payment = await this.getPaymentById(paymentId);
    
    if (payment.status === 'PAID') {
      throw new BadRequestException('Payment already processed');
    }

    const updatedPayment = await this.updatePaymentStatus(paymentId, 'FAILED');

    // Update order status to CANCELLED
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'CANCELLED' },
    });

    return updatedPayment;
  }

  async refundPayment(paymentId: string, amount?: number) {
    const payment = await this.getPaymentById(paymentId);
    
    if (payment.status !== 'PAID') {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const refundAmount = amount || Number(payment.amount);
    
    if (refundAmount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    const updatedPayment = await this.updatePaymentStatus(paymentId, 'REFUNDED');

    // Update order status to REFUNDED
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'REFUNDED' },
    });

    // Process refund to buyer's wallet
    await this.processRefundToWallet(payment.order.buyerId, refundAmount, paymentId);

    return updatedPayment;
  }

  private async processSellerPayouts(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            seller: true,
          },
        },
      },
    });

    if (!order) return;

    for (const item of order.items) {
      const seller = item.seller;
      
      // Get or create seller's wallet
      let wallet = await this.prisma.wallet.findUnique({
        where: { userId: seller.id },
      });

      if (!wallet) {
        wallet = await this.prisma.wallet.create({
          data: {
            userId: seller.id,
            balance: 0,
            currency: 'IRR',
          },
        });
      }

      // Add seller payout to wallet
      const newBalance = Number(wallet.balance) + Number(item.sellerPayout);
      
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Create wallet transaction
      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'SALE_INCOME',
          amount: item.sellerPayout,
          balanceAfter: newBalance,
          refType: 'ORDER_PAYMENT',
          refId: orderId,
          meta: {
            orderId,
            itemId: item.id,
            platformFee: item.platformFee,
          },
        },
      });
    }
  }

  private async processRefundToWallet(buyerId: string, amount: number, paymentId: string) {
    // Get or create buyer's wallet
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: buyerId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId: buyerId,
          balance: 0,
          currency: 'IRR',
        },
      });
    }

    // Add refund to wallet
    const newBalance = Number(wallet.balance) + amount;
    
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    // Create wallet transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'REFUND',
        amount: amount,
        balanceAfter: newBalance,
        refType: 'PAYMENT_REFUND',
        refId: paymentId,
        meta: {
          paymentId,
          refundAmount: amount,
        },
      },
    });
  }

  async getPaymentStats() {
    const [
      totalPayments,
      totalAmount,
      successfulPayments,
      failedPayments,
      pendingPayments,
      refundedPayments,
      paymentsByGateway,
      recentPayments,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: { status: 'PAID' } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'REFUNDED' } }),
      this.prisma.payment.groupBy({
        by: ['gateway'],
        _count: { gateway: true },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      total: totalPayments,
      totalAmount: totalAmount._sum.amount || 0,
      successful: successfulPayments,
      failed: failedPayments,
      pending: pendingPayments,
      refunded: refundedPayments,
      byGateway: paymentsByGateway,
      recent24h: recentPayments,
    };
  }
}
