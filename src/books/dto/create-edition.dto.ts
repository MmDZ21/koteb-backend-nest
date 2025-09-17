import { IsString, IsOptional, IsInt, IsArray, MinLength, IsNotEmpty } from 'class-validator';

export class CreateEditionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsArray()
  @IsString({ each: true })
  authors: string[];

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsInt()
  publishedYear?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  pageCount?: number;

  @IsOptional()
  @IsString()
  coverKey?: string;

  @IsOptional()
  identifiers?: Record<string, any>;
}
