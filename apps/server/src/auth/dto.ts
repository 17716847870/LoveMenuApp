import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MaxLength(32)
  phone!: string;
}

export class CodeLoginDto extends LoginDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class PasswordLoginDto extends LoginDto {
  @IsString()
  @Length(8, 64)
  @Matches(/^(?=.*[a-z])(?=.*\d).+$/)
  password!: string;
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
