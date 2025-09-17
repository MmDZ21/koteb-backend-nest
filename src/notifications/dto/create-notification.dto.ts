import { IsString, IsEnum, IsOptional, IsNotEmpty, IsObject } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
