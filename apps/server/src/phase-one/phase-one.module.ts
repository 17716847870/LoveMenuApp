import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MenusModule } from '../menus/menus.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PhaseOneController } from './phase-one.controller';
import { PhaseOneService } from './phase-one.service';

@Module({
  imports: [AuthModule, MenusModule, UploadsModule],
  controllers: [PhaseOneController],
  providers: [PhaseOneService],
})
export class PhaseOneModule {}
