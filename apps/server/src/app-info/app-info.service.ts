import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type VersionCheckPayload = {
  platform?: 'ios' | 'android' | 'web';
  current_version?: string;
  build_number?: string;
};

@Injectable()
export class AppInfoService {
  constructor(private readonly configService: ConfigService) {}

  getAbout() {
    return {
      appName: this.configService.get<string>('APP_ABOUT_NAME') ?? 'LoveMenu',
      slogan: this.configService.get<string>('APP_ABOUT_SLOGAN') ?? '给情侣一起点餐、记录和陪伴的小应用',
      description:
        this.configService.get<string>('APP_ABOUT_DESCRIPTION') ??
        'LoveMenu 是一个为情侣设计的生活协作应用，可以一起创建菜单、点单、记录反馈、管理情侣绑定关系，把日常吃饭和相处变成更轻松的共同记录。',
      version: this.configService.get<string>('APP_LATEST_VERSION') ?? '1.0.0',
      companyName: this.configService.get<string>('APP_COMPANY_NAME') ?? '云渚科技',
      copyright: this.configService.get<string>('APP_COPYRIGHT') ?? '© 2026 云渚科技',
      contactEmail: this.configService.get<string>('APP_CONTACT_EMAIL') ?? '',
      privacyPolicyUrl: this.configService.get<string>('APP_PRIVACY_POLICY_URL') ?? '',
      termsUrl: this.configService.get<string>('APP_TERMS_URL') ?? '',
      icpRecord: this.configService.get<string>('APP_ICP_RECORD') ?? '',
      policeRecord: this.configService.get<string>('APP_POLICE_RECORD') ?? '',
      features: this.getStringList('APP_ABOUT_FEATURES', [
        '情侣账号绑定',
        '菜单发布和点单',
        '订单状态管理',
        '甜蜜空间记录',
        '经期与纪念日提醒',
      ]),
    };
  }

  checkVersion(payload: VersionCheckPayload) {
    const platform = payload.platform ?? 'android';
    const latestVersion = this.getPlatformConfig(platform, 'LATEST_VERSION') ?? '1.0.0';
    const latestBuildNumber = this.getPlatformConfig(platform, 'LATEST_BUILD_NUMBER') ?? '1';
    const minSupportedVersion = this.getPlatformConfig(platform, 'MIN_SUPPORTED_VERSION') ?? '1.0.0';
    const currentVersion = payload.current_version ?? '0.0.0';
    const currentBuildNumber = payload.build_number ?? '0';
    const hasUpdate =
      this.compareVersion(currentVersion, latestVersion) < 0 ||
      (currentVersion === latestVersion && Number(currentBuildNumber) < Number(latestBuildNumber));
    const forceUpdate = this.compareVersion(currentVersion, minSupportedVersion) < 0;

    return {
      latestVersion,
      latestBuildNumber,
      minSupportedVersion,
      hasUpdate,
      forceUpdate,
      title: hasUpdate ? '发现新版本' : '当前已是最新版本',
      releaseNotes: this.getStringList(`${platform.toUpperCase()}_RELEASE_NOTES`, ['优化使用体验', '修复已知问题']),
      downloadUrl: this.getPlatformConfig(platform, 'DOWNLOAD_URL') ?? '',
      storeUrl: this.getPlatformConfig(platform, 'STORE_URL') ?? '',
    };
  }

  private getPlatformConfig(platform: string, key: string) {
    return (
      this.configService.get<string>(`APP_${platform.toUpperCase()}_${key}`) ??
      this.configService.get<string>(`APP_${key}`)
    );
  }

  private getStringList(key: string, fallback: string[]) {
    const value = this.configService.get<string>(key);
    if (!value) {
      return fallback;
    }

    return value
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private compareVersion(left: string, right: string) {
    const leftParts = left.split('.').map((item) => Number(item) || 0);
    const rightParts = right.split('.').map((item) => Number(item) || 0);
    const length = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < length; index += 1) {
      const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
      if (diff !== 0) {
        return diff > 0 ? 1 : -1;
      }
    }

    return 0;
  }
}
