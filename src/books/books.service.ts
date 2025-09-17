import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEditionDto } from './dto/create-edition.dto';
import { UpdateEditionDto } from './dto/update-edition.dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async createEdition(createEditionDto: CreateEditionDto) {
    try {
      const edition = await this.prisma.edition.create({
        data: createEditionDto,
        include: {
          authorsRel: true,
        },
      });
      return edition;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Edition with this title already exists');
      }
      throw error;
    }
  }

  async getAllEditions(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { authors: { has: search } },
        { publisher: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [editions, total] = await Promise.all([
      this.prisma.edition.findMany({
        where,
        skip,
        take: limit,
        include: {
          authorsRel: true,
          _count: {
            select: {
              listings: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.edition.count({ where }),
    ]);

    return {
      data: editions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getEditionById(id: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id },
      include: {
        authorsRel: true,
        listings: {
          where: { status: 'APPROVED' },
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                isSellerVerified: true,
              },
            },
            images: true,
          },
        },
        reviews: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            listings: true,
            reviews: true,
          },
        },
      },
    });

    if (!edition) {
      throw new NotFoundException('Edition not found');
    }

    return edition;
  }

  async updateEdition(id: string, updateEditionDto: UpdateEditionDto) {
    try {
      const edition = await this.prisma.edition.update({
        where: { id },
        data: updateEditionDto,
        include: {
          authorsRel: true,
        },
      });
      return edition;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Edition not found');
      }
      throw error;
    }
  }

  async deleteEdition(id: string) {
    try {
      await this.prisma.edition.delete({
        where: { id },
      });
      return { message: 'Edition deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Edition not found');
      }
      throw error;
    }
  }

  async searchEditions(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const where = {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { authors: { has: query } },
        { publisher: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
      ]
    };

    const [editions, total] = await Promise.all([
      this.prisma.edition.findMany({
        where,
        skip,
        take: limit,
        include: {
          authorsRel: true,
          _count: {
            select: {
              listings: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.edition.count({ where }),
    ]);

    return {
      data: editions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
