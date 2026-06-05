import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MaxLength(32)
  phone!: string;
}

export class RegisterDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @IsString()
  @MaxLength(64)
  nickname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar_url?: string;

  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';

  @IsOptional()
  @IsString()
  birthday?: string;
}
