import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'IRR';

  @IsString()
  bankInfo: string; // JSON string containing bank details
}
