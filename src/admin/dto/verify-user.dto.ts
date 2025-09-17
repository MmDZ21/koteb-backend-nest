import { IsEnum, IsString, IsOptional } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class VerifyUserDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
