import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SpaceModule } from '../space/space.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, SpaceModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
