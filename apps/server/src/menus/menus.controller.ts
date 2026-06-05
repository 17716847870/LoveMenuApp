import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { MenusService } from './menus.service';

@Controller('menus')
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get('bootstrap')
  getBootstrapData() {
    return this.menusService.getBootstrapData();
  }

  @Get()
  async listMenus(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.menusService.listMenusForUser(userId));
  }

  @Get(':id')
  async getMenu(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.menusService.getMenu(id, userId));
  }

  @Post()
  async createMenu(@Body() body: Parameters<MenusService['createMenu']>[0], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.menusService.createMenu(body, userId));
  }

  @Patch(':id')
  async updateMenu(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Parameters<MenusService['updateMenu']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.menusService.updateMenu(id, body, userId));
  }
}

@Controller('menu-categories')
@UseGuards(JwtAuthGuard)
export class MenuCategoriesController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  async listCategories(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.menusService.listCategoriesForUser(userId));
  }

  @Post()
  async createCategory(
    @Body() body: Parameters<MenusService['createCategory']>[0],
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.menusService.createCategory(body, userId));
  }

  @Patch(':id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Parameters<MenusService['updateCategory']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.menusService.updateCategory(id, body, userId));
  }

  @Delete(':id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.menusService.deleteCategory(id, userId));
  }
}
