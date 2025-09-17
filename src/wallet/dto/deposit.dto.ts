import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'IRR';

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
