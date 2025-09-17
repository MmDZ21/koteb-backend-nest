import { IsEmail, IsString, MinLength, IsOptional, IsNotEmpty, Matches, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(({ value }) => value?.trim())
    name: string;

    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
    password: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Matches(/^[\+]?[1-9][\d]{0,15}$/, { message: 'Please provide a valid phone number' })
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    @Transform(({ value }) => value?.trim())
    bio?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    @Matches(/^https?:\/\/.+/, { message: 'Profile picture must be a valid URL' })
    profilePic?: string;
}