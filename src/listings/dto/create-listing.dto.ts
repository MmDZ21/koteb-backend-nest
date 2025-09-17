import { IsString, IsUUID, IsNumber, IsEnum, IsOptional, IsInt, Min, IsNotEmpty } from 'class-validator';
import { Condition, BookStatus } from '@prisma/client';

export class CreateListingDto {
  @IsUUID()
  @IsNotEmpty()
  editionId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string = 'IRR';

  @IsEnum(Condition)
  condition: Condition;

  @IsString()
  @IsOptional()
  conditionNote?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus = 'DRAFT';
}
