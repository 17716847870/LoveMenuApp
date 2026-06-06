import DypnsapiClient, { CheckSmsVerifyCodeRequest, SendSmsVerifyCodeRequest } from '@alicloud/dypnsapi20170525';
import { Config } from '@alicloud/openapi-client';
import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { SmsCodeScene } from './dto';

const sceneTemplateEnvMap: Record<SmsCodeScene, string> = {
  login: 'ALIYUN_SMS_TEMPLATE_CODE_LOGIN_REGISTER',
  register: 'ALIYUN_SMS_TEMPLATE_CODE_LOGIN_REGISTER',
  change_phone: 'ALIYUN_SMS_TEMPLATE_CODE_CHANGE_PHONE',
  bind_new_phone: 'ALIYUN_SMS_TEMPLATE_CODE_BIND_NEW_PHONE',
  verify_bound_phone: 'ALIYUN_SMS_TEMPLATE_CODE_VERIFY_BOUND_PHONE',
  reset_password: 'ALIYUN_SMS_TEMPLATE_CODE_RESET_PASSWORD',
};

@Injectable()
export class SmsService {
  private readonly codeTtlMinutes = 5;
  private readonly sendIntervalSeconds = 60;
  private readonly countryCode = '86';
  private readonly latestOutIds = new Map<string, string>();
  private readonly nextSendAtByKey = new Map<string, number>();
  private aliyunClient: DypnsapiClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationCode(phone: string, scene: SmsCodeScene) {
    const normalizedPhone = this.normalizePhone(phone);
    const outIdKey = this.createOutIdKey(normalizedPhone, scene);
    const now = Date.now();
    const nextSendAt = this.nextSendAtByKey.get(outIdKey) ?? 0;
    if (nextSendAt > now) {
      throw new HttpException(
        {
          message: '验证码发送太频繁',
          retry_after_seconds: Math.ceil((nextSendAt - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const outId = this.createOutId(scene);
    await this.sendByAliyun(normalizedPhone, scene, outId);
    this.latestOutIds.set(outIdKey, outId);
    this.nextSendAtByKey.set(outIdKey, now + this.sendIntervalSeconds * 1000);

    return {
      sent: true,
      expires_in_seconds: this.codeTtlMinutes * 60,
      retry_after_seconds: this.sendIntervalSeconds,
    };
  }

  async verifyCode(phone: string, code: string, scene: SmsCodeScene = 'login') {
    const normalizedPhone = this.normalizePhone(phone);
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new BadRequestException('验证码格式不正确');
    }

    await this.checkByAliyun(normalizedPhone, cleanCode, this.latestOutIds.get(this.createOutIdKey(normalizedPhone, scene)));
  }

  private async sendByAliyun(phone: string, scene: SmsCodeScene, outId: string) {
    const accessKeyId = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET');
    const signName = this.configService.get<string>('ALIYUN_SMS_SIGN_NAME');
    const templateCode = this.resolveTemplateCode(scene);
    const region = this.configService.get<string>('ALIYUN_SMS_REGION') ?? 'cn-hangzhou';
    const endpoint = this.configService.get<string>('ALIYUN_SMS_ENDPOINT') ?? 'dypnsapi.aliyuncs.com';

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw new ServiceUnavailableException('短信服务配置不完整');
    }

    const client = this.getAliyunClient(accessKeyId, accessKeySecret, region, endpoint);
    const response = await client.sendSmsVerifyCode(
      new SendSmsVerifyCodeRequest({
        phoneNumber: phone,
        countryCode: this.countryCode,
        signName,
        templateCode,
        templateParam: JSON.stringify({ code: '##code##', min: String(this.codeTtlMinutes) }),
        outId,
        interval: this.sendIntervalSeconds,
        validTime: this.codeTtlMinutes * 60,
        returnVerifyCode: false,
        codeType: 1,
        codeLength: 6,
        duplicatePolicy: 1,
      }),
    );
    const body = response.body;

    if (body?.code !== 'OK' || body.success === false) {
      throw new ServiceUnavailableException('短信发送失败，请稍后再试');
    }

    return {
      provider: 'aliyun-dypnsapi',
      requestId: body.requestId ?? body.model?.requestId ?? null,
      bizId: body.model?.bizId ?? null,
    };
  }

  private resolveTemplateCode(scene: SmsCodeScene) {
    return this.configService.get<string>(sceneTemplateEnvMap[scene]) ?? this.configService.get<string>('ALIYUN_SMS_TEMPLATE_CODE');
  }

  private async checkByAliyun(phone: string, code: string, outId?: string) {
    const accessKeyId = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET');
    const region = this.configService.get<string>('ALIYUN_SMS_REGION') ?? 'cn-hangzhou';
    const endpoint = this.configService.get<string>('ALIYUN_SMS_ENDPOINT') ?? 'dypnsapi.aliyuncs.com';

    if (!accessKeyId || !accessKeySecret) {
      throw new ServiceUnavailableException('短信服务配置不完整');
    }

    const client = this.getAliyunClient(accessKeyId, accessKeySecret, region, endpoint);
    let response;
    try {
      response = await client.checkSmsVerifyCode(
        new CheckSmsVerifyCodeRequest({
          phoneNumber: phone,
          countryCode: this.countryCode,
          verifyCode: code,
          outId,
          caseAuthPolicy: 1,
        }),
      );
    } catch (error) {
      if (this.isAliyunValidateFail(error)) {
        throw new BadRequestException('验证码错误或已过期');
      }
      throw error;
    }
    const body = response.body;

    if (body?.code !== 'OK' || body.success === false || body.model?.verifyResult !== 'PASS') {
      throw new BadRequestException('验证码错误或已过期');
    }
  }

  private isAliyunValidateFail(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: unknown; data?: { Code?: unknown } };
    return candidate.code === 'isv.ValidateFail' || candidate.data?.Code === 'isv.ValidateFail';
  }

  private getAliyunClient(accessKeyId: string, accessKeySecret: string, region: string, endpoint: string) {
    if (!this.aliyunClient) {
      this.aliyunClient = new DypnsapiClient(
        new Config({
          accessKeyId,
          accessKeySecret,
          regionId: region,
          endpoint,
        }),
      );
    }

    return this.aliyunClient;
  }

  private normalizePhone(phone: string) {
    const normalizedPhone = phone.trim().replace(/\s/g, '').replace(/^\+86/, '').replace(/^86(?=1\d{10}$)/, '');
    if (!/^1\d{10}$/.test(normalizedPhone)) {
      throw new BadRequestException('手机号格式不正确');
    }
    return normalizedPhone;
  }

  private createOutId(scene: SmsCodeScene) {
    return `${scene}-${Date.now()}-${randomUUID()}`;
  }

  private createOutIdKey(phone: string, scene: SmsCodeScene) {
    return `${scene}:${phone}`;
  }
}
