import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class EnvironmentVariables {
  @IsString()
  NODE_ENV: string = 'development';

  @IsNumber()
  @Type(() => Number)
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsString()
  SMTP_PORT?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = new EnvironmentVariables();
  
  Object.assign(validatedConfig, config);
  
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }

  // Additional JWT secret validation
  if (validatedConfig.JWT_SECRET === 'changeme' || validatedConfig.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long and not use default value');
  }

  return validatedConfig;
}
