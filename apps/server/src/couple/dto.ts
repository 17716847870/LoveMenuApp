import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateInviteDto {
}

export class BindByInviteDto {
  @IsString()
  @Length(6, 6)
  invite_code!: string;

}

export class ConfirmRelationshipRoleDto {
  @IsInt()
  @Min(1)
  publisher_user_id!: number;

  @IsInt()
  @Min(1)
  consumer_user_id!: number;

  @IsString()
  together_since!: string;
}

export class UpdateRelationshipRoleDto {
  @IsInt()
  @Min(1)
  publisher_user_id!: number;

  @IsInt()
  @Min(1)
  consumer_user_id!: number;
}
