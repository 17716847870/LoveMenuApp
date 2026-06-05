import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MenuRequestsController } from './menu-requests.controller';
import { MenuRequestsService } from './menu-requests.service';

@Module({
  imports: [AuthModule],
  controllers: [MenuRequestsController],
  providers: [MenuRequestsService],
})
export class MenuRequestsModule {}
