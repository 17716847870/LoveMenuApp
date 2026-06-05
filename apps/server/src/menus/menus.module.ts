import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MenuCategoriesController, MenusController } from './menus.controller';
import { MenusService } from './menus.service';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [MenusController, MenuCategoriesController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
