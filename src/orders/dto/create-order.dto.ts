import { IsArray, IsUUID, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  listingId: string;

  @IsUUID()
  @IsNotEmpty()
  editionId: string;

  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @IsNotEmpty()
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsUUID()
  @IsOptional()
  shippingAddrId?: string;

  @IsOptional()
  shippingAmount?: number = 0;

  @IsOptional()
  platformFee?: number = 0;
}
