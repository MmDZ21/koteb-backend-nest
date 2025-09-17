import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyUserDto } from './dto/verify-user.dto';
import { VerificationStatus, BookStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyUser(adminId: string, userId: string, verifyUserDto: VerifyUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user verification status
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: verifyUserDto.status === 'APPROVED',
        isSellerVerified: verifyUserDto.status === 'APPROVED' && user.isSeller,
      },
    });

    // Update verification record
    if (user.verifications.length > 0) {
      await this.prisma.verification.update({
        where: { id: user.verifications[0].id },
        data: {
          status: verifyUserDto.status,
          adminNote: verifyUserDto.adminNote,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });
    }

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'KYC_VERIFY',
        targetType: 'USER',
        targetId: userId,
        meta: {
          status: verifyUserDto.status,
          adminNote: verifyUserDto.adminNote,
        },
      },
    });

    return updatedUser;
  }

  async getPendingVerifications(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      this.prisma.verification.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isSeller: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.verification.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      data: verifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingListings(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        include: {
          edition: true,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              isSellerVerified: true,
            },
          },
          images: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.listing.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      data: listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async approveListing(adminId: string, listingId: string, adminNote?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new ForbiddenException('Only pending listings can be approved');
    }

    const updatedListing = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'APPROVED',
        approvedById: adminId,
        adminNote,
      },
      include: {
        edition: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'LISTING_APPROVE',
        targetType: 'LISTING',
        targetId: listingId,
        meta: {
          adminNote,
        },
      },
    });

    return updatedListing;
  }

  async rejectListing(adminId: string, listingId: string, adminNote: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new ForbiddenException('Only pending listings can be rejected');
    }

    const updatedListing = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'REJECTED',
        approvedById: adminId,
        adminNote,
      },
      include: {
        edition: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'LISTING_REJECT',
        targetType: 'LISTING',
        targetId: listingId,
        meta: {
          adminNote,
        },
      },
    });

    return updatedListing;
  }

  async getDashboardStats() {
    const [
      totalUsers,
      verifiedUsers,
      totalListings,
      pendingListings,
      totalOrders,
      completedOrders,
      totalRevenue,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.listing.count(),
      this.prisma.listing.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { platformFee: true },
      }),
      this.prisma.withdrawRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        pending: totalUsers - verifiedUsers,
      },
      listings: {
        total: totalListings,
        pending: pendingListings,
        approved: totalListings - pendingListings,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: totalOrders - completedOrders,
      },
      revenue: {
        total: totalRevenue._sum.platformFee || 0,
      },
      withdrawals: {
        pending: pendingWithdrawals,
      },
    };
  }

  async getRecentActivity(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAuditLog.count(),
    ]);

    return {
      data: auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20, search?: string, verified?: boolean) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (verified !== undefined) {
      where.isVerified = verified;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          isSeller: true,
          isSellerVerified: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
