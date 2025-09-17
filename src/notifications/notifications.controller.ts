import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationChannel } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Request() req, @Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(req.user.userId, createNotificationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('channel') channel?: NotificationChannel,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.notificationsService.getAllNotifications(pageNum, limitNum, channel);
  }

  @Get('my-notifications')
  @UseGuards(JwtAuthGuard)
  getMyNotifications(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const unread = unreadOnly === 'true';
    return this.notificationsService.getUserNotifications(req.user.userId, pageNum, limitNum, unread);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.notificationsService.getNotificationStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.getNotificationById(id);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  getMyNotification(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.getUserNotificationById(req.user.userId, id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(req.user.userId, id);
  }

  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.updateNotification(id, updateNotificationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.deleteNotification(id);
  }

  @Delete('my/:id')
  @UseGuards(JwtAuthGuard)
  removeMyNotification(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.deleteUserNotification(req.user.userId, id);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  sendBulkNotification(
    @Body('userIds') userIds: string[],
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.sendBulkNotification(userIds, createNotificationDto);
  }
}
