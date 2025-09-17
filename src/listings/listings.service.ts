import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { BookStatus } from '@prisma/client';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createListing(userId: string, createListingDto: CreateListingDto) {
    // Check if user is verified seller
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSeller: true, isSellerVerified: true },
    });

    if (!user?.isSeller || !user?.isSellerVerified) {
      throw new ForbiddenException('User must be a verified seller to create listings');
    }

    // Verify edition exists
    const edition = await this.prisma.edition.findUnique({
      where: { id: createListingDto.editionId },
    });

    if (!edition) {
      throw new NotFoundException('Edition not found');
    }

    const listing = await this.prisma.listing.create({
      data: {
        ...createListingDto,
        sellerId: userId,
      },
      include: {
        edition: true,
        seller: {
          select: {
            id: true,
            name: true,
            isSellerVerified: true,
          },
        },
        images: true,
      },
    });

    return listing;
  }

  async getAllListings(page: number = 1, limit: number = 10, search?: string, status?: BookStatus) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { edition: { title: { contains: search, mode: 'insensitive' as const } } },
        { edition: { authors: { has: search } } },
        { seller: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: {
          edition: true,
          seller: {
            select: {
              id: true,
              name: true,
              isSellerVerified: true,
            },
          },
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where }),
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

  async getListingById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        edition: {
          include: {
            authorsRel: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            isSellerVerified: true,
            profilePic: true,
          },
        },
        images: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  async getUserListings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { sellerId: userId },
        skip,
        take: limit,
        include: {
          edition: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where: { sellerId: userId } }),
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

  async updateListing(userId: string, id: string, updateListingDto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Don't allow updating approved listings
    if (listing.status === 'APPROVED') {
      throw new BadRequestException('Cannot update approved listings');
    }

    const updatedListing = await this.prisma.listing.update({
      where: { id },
      data: updateListingDto,
      include: {
        edition: true,
        seller: {
          select: {
            id: true,
            name: true,
            isSellerVerified: true,
          },
        },
        images: true,
      },
    });

    return updatedListing;
  }

  async deleteListing(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.prisma.listing.delete({
      where: { id },
    });

    return { message: 'Listing deleted successfully' };
  }

  async approveListing(adminId: string, id: string, adminNote?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new BadRequestException('Only pending listings can be approved');
    }

    const updatedListing = await this.prisma.listing.update({
      where: { id },
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
            isSellerVerified: true,
          },
        },
        images: true,
      },
    });

    return updatedListing;
  }

  async rejectListing(adminId: string, id: string, adminNote: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new BadRequestException('Only pending listings can be rejected');
    }

    const updatedListing = await this.prisma.listing.update({
      where: { id },
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
            isSellerVerified: true,
          },
        },
        images: true,
      },
    });

    return updatedListing;
  }
}
