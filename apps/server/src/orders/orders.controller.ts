import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('bootstrap')
  getBootstrapData() {
    return this.ordersService.getBootstrapData();
  }

  @Post()
  async createOrder(@Body() body: Parameters<OrdersService['createOrder']>[0], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.ordersService.createOrder(body, userId));
  }

  @Get()
  async listOrders(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.ordersService.listOrdersForUser(userId));
  }

  @Get(':id')
  async getOrder(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.ordersService.getOrder(id, userId));
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Parameters<OrdersService['updateOrderStatus']>[1],
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.ordersService.updateOrderStatus(id, body, userId));
  }

  @Get(':id/status-logs')
  async getOrderStatusLogs(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.ordersService.getOrderStatusLogs(id, userId));
  }

  @Post(':id/feedback')
  async createFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Omit<Parameters<OrdersService['createOrderFeedback']>[1], 'order_id'>,
    @CurrentUserId() userId: bigint,
  ) {
    return dataResponse(await this.ordersService.createOrderFeedback(id, body, userId));
  }
}
