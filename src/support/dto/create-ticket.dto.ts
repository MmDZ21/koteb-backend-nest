import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = 'MEDIUM';
}
