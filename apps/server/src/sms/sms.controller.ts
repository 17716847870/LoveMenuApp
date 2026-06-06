import { Body, Controller, Post } from '@nestjs/common';

import { dataResponse } from '../common/api-response';
import { SendSmsCodeDto } from './dto';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('verification-code')
  async sendVerificationCode(@Body() body: SendSmsCodeDto) {
    return dataResponse(await this.smsService.sendVerificationCode(body.phone, body.scene));
  }
}
