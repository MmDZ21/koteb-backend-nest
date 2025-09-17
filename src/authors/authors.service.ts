import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuthor(createAuthorDto: CreateAuthorDto) {
    try {
      const author = await this.prisma.author.create({
        data: createAuthorDto,
      });
      return author;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Author with this slug already exists');
      }
      throw error;
    }
  }

  async getAllAuthors(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { slug: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [authors, total] = await Promise.all([
      this.prisma.author.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              editions: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.author.count({ where }),
    ]);

    return {
      data: authors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAuthorById(id: string) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        editions: {
          include: {
            _count: {
              select: {
                listings: true,
                reviews: true,
              },
            },
          },
          orderBy: { publishedYear: 'desc' },
        },
        _count: {
          select: {
            editions: true,
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    return author;
  }

  async getAuthorBySlug(slug: string) {
    const author = await this.prisma.author.findUnique({
      where: { slug },
      include: {
        editions: {
          include: {
            _count: {
              select: {
                listings: true,
                reviews: true,
              },
            },
          },
          orderBy: { publishedYear: 'desc' },
        },
        _count: {
          select: {
            editions: true,
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    return author;
  }

  async updateAuthor(id: string, updateAuthorDto: UpdateAuthorDto) {
    try {
      const author = await this.prisma.author.update({
        where: { id },
        data: updateAuthorDto,
      });
      return author;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Author not found');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Author with this slug already exists');
      }
      throw error;
    }
  }

  async deleteAuthor(id: string) {
    try {
      await this.prisma.author.delete({
        where: { id },
      });
      return { message: 'Author deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Author not found');
      }
      throw error;
    }
  }
}
