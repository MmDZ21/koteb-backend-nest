import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, createReviewDto: CreateReviewDto) {
    // Validate that either targetUserId or editionId is provided
    if (!createReviewDto.targetUserId && !createReviewDto.editionId) {
      throw new BadRequestException('Either targetUserId or editionId must be provided');
    }

    // Check if user has completed an order with the target user or for the edition
    if (createReviewDto.targetUserId) {
      const hasOrder = await this.prisma.order.findFirst({
        where: {
          buyerId: userId,
          items: {
            some: {
              sellerId: createReviewDto.targetUserId,
            },
          },
          status: 'COMPLETED',
        },
      });

      if (!hasOrder) {
        throw new BadRequestException('You can only review users you have completed orders with');
      }
    }

    if (createReviewDto.editionId) {
      const hasOrder = await this.prisma.order.findFirst({
        where: {
          buyerId: userId,
          items: {
            some: {
              editionId: createReviewDto.editionId,
            },
          },
          status: 'COMPLETED',
        },
      });

      if (!hasOrder) {
        throw new BadRequestException('You can only review editions you have purchased');
      }
    }

    // Check if user has already reviewed this target
    const existingReview = await this.prisma.review.findFirst({
      where: {
        authorId: userId,
        targetUserId: createReviewDto.targetUserId,
        editionId: createReviewDto.editionId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this target');
    }

    const review = await this.prisma.review.create({
      data: {
        ...createReviewDto,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        edition: {
          select: {
            id: true,
            title: true,
            authors: true,
          },
        },
      },
    });

    return review;
  }

  async getAllReviews(page: number = 1, limit: number = 20, targetUserId?: string, editionId?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (targetUserId) {
      where.targetUserId = targetUserId;
    }
    if (editionId) {
      where.editionId = editionId;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
          edition: {
            select: {
              id: true,
              title: true,
              authors: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewById(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        edition: {
          select: {
            id: true,
            title: true,
            authors: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async getUserReviews(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { authorId: userId },
        skip,
        take: limit,
        include: {
          targetUser: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
          edition: {
            select: {
              id: true,
              title: true,
              authors: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { authorId: userId } }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewsForUser(targetUserId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { targetUserId },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { targetUserId } }),
    ]);

    // Calculate average rating
    const avgRating = await this.prisma.review.aggregate({
      where: { targetUserId },
      _avg: { rating: true },
    });

    return {
      data: reviews,
      averageRating: avgRating._avg.rating || 0,
      totalReviews: total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewsForEdition(editionId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { editionId },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { editionId } }),
    ]);

    // Calculate average rating
    const avgRating = await this.prisma.review.aggregate({
      where: { editionId },
      _avg: { rating: true },
    });

    return {
      data: reviews,
      averageRating: avgRating._avg.rating || 0,
      totalReviews: total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateReview(userId: string, id: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.authorId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        edition: {
          select: {
            id: true,
            title: true,
            authors: true,
          },
        },
      },
    });

    return updatedReview;
  }

  async deleteReview(userId: string, id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return { message: 'Review deleted successfully' };
  }
}
