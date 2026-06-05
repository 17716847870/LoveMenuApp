import { Module } from '@nestjs/common';

import { AnniversariesModule } from '../anniversaries/anniversaries.module';
import { AuthModule } from '../auth/auth.module';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';

@Module({
  imports: [AnniversariesModule, AuthModule],
  controllers: [CoupleController],
  providers: [CoupleService],
})
export class CoupleModule {}
