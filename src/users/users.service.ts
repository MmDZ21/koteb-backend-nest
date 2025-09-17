import { Injectable, UnprocessableEntityException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(body: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...body,
          password: await bcrypt.hash(body.password, 10),
        },
        select: {
          email: true,
          name: true,
          id: true,
        },
      });
      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new UnprocessableEntityException('Email already exists.');
      }
      throw error;
    }
  }
  async getAllUsers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          email: true,
          name: true,
          id: true,
          phone: true,
          bio: true,
          profilePic: true,
          isVerified: true,
          isSeller: true,
          isSellerVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getUserById(id: string) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: { id },
        select: {
          email: true,
          name: true,
          id: true,
          phone: true,
          bio: true,
          profilePic: true,
          isVerified: true,
          isSeller: true,
          isSellerVerified: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: { email },
        select: {
          email: true,
          name: true,
          id: true,
          phone: true,
          bio: true,
          profilePic: true,
          isVerified: true,
          isSeller: true,
          isSellerVerified: true,
          createdAt: true,
          updatedAt: true,
          password: true, // Include password for authentication
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async getUserByEmailPublic(email: string) {
    try {
      return await this.prisma.user.findUniqueOrThrow({
        where: { email },
        select: {
          email: true,
          name: true,
          id: true,
          phone: true,
          bio: true,
          profilePic: true,
          isVerified: true,
          isSeller: true,
          isSellerVerified: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async updateUser(currentUserId: string, id: string, updateUserDto: UpdateUserDto) {
    try {
      // Check if user exists
      await this.getUserById(id);

      // Check if user is updating their own profile
      if (currentUserId !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }

      // Prepare update data
      const updateData: any = { ...updateUserDto };
      
      // Hash password if provided
      if (updateUserDto.password) {
        updateData.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          email: true,
          name: true,
          id: true,
          phone: true,
          bio: true,
          profilePic: true,
          isVerified: true,
          isSeller: true,
          isSellerVerified: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }

  async deleteUser(currentUserId: string, id: string) {
    try {
      // Check if user exists
      await this.getUserById(id);

      // Check if user is deleting their own profile
      if (currentUserId !== id) {
        throw new ForbiddenException('You can only delete your own profile');
      }

      return await this.prisma.user.delete({
        where: { id },
        select: {
          email: true,
          name: true,
          id: true,
        }
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }

  async validateUser(email: string, plainPassword: string) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const matched = await bcrypt.compare(plainPassword, user.password);
    if (!matched) return null;
    const { password, ...rest } = user as any;
    return rest;
  }
}
