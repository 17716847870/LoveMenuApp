import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AppInfoModule } from './app-info/app-info.module';
import { AppService } from './app.service';
import { AnniversariesModule } from './anniversaries/anniversaries.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CoupleModule } from './couple/couple.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MenusModule } from './menus/menus.module';
import { MenuRequestsModule } from './menu-requests/menu-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PeriodModule } from './period/period.module';
import { PhaseOneModule } from './phase-one/phase-one.module';
import { SpaceModule } from './space/space.module';
import { SmsModule } from './sms/sms.module';
import { UploadsModule } from './uploads/uploads.module';
import { WheelModule } from './wheel/wheel.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
    AppInfoModule,
    PrismaModule,
    AnniversariesModule,
    AuthModule,
    ChatModule,
    CoupleModule,
    UsersModule,
    MenusModule,
    MenuRequestsModule,
    NotificationsModule,
    OrdersModule,
    PeriodModule,
    PhaseOneModule,
    SmsModule,
    SpaceModule,
    UploadsModule,
    WheelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
