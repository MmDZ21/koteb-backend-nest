import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(userId: string, createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        userId,
      },
    });

    return notification;
  }

  async getAllNotifications(page: number = 1, limit: number = 20, channel?: NotificationChannel) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (channel) {
      where.channel = channel;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
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
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getNotificationById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getUserNotificationById(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.getUserNotificationById(userId, id);
    
    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return updatedNotification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return {
      message: 'All notifications marked as read',
      updatedCount: result.count,
    };
  }

  async updateNotification(id: string, updateNotificationDto: UpdateNotificationDto) {
    try {
      const notification = await this.prisma.notification.update({
        where: { id },
        data: updateNotificationDto,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return notification;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Notification not found');
      }
      throw error;
    }
  }

  async deleteNotification(id: string) {
    try {
      await this.prisma.notification.delete({
        where: { id },
      });

      return { message: 'Notification deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Notification not found');
      }
      throw error;
    }
  }

  async deleteUserNotification(userId: string, id: string) {
    const notification = await this.getUserNotificationById(userId, id);
    
    await this.prisma.notification.delete({
      where: { id },
    });

    return { message: 'Notification deleted successfully' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { unreadCount: count };
  }

  async sendBulkNotification(userIds: string[], createNotificationDto: CreateNotificationDto) {
    const notifications = await Promise.all(
      userIds.map(userId => 
        this.prisma.notification.create({
          data: {
            ...createNotificationDto,
            userId,
          },
        })
      )
    );

    return {
      message: 'Bulk notification sent successfully',
      sentCount: notifications.length,
      notifications,
    };
  }

  async getNotificationStats() {
    const [
      totalNotifications,
      unreadNotifications,
      notificationsByChannel,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { read: false } }),
      this.prisma.notification.groupBy({
        by: ['channel'],
        _count: { channel: true },
      }),
      this.prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      total: totalNotifications,
      unread: unreadNotifications,
      byChannel: notificationsByChannel,
      recent24h: recentNotifications,
    };
  }
}
