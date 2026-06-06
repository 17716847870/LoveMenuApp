import { IsIn, IsString, MaxLength } from 'class-validator';

const smsCodeScenes = ['login', 'register', 'change_phone', 'bind_new_phone', 'verify_bound_phone', 'reset_password'] as const;
export type SmsCodeScene = (typeof smsCodeScenes)[number];

export class SendSmsCodeDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsIn(smsCodeScenes)
  scene!: SmsCodeScene;
}
