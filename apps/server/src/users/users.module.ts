import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SmsModule } from '../sms/sms.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, UploadsModule, SmsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
