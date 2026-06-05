import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WheelController } from './wheel.controller';
import { WheelService } from './wheel.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WheelController],
  providers: [WheelService],
})
export class WheelModule {}
