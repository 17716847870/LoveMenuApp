import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';

import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dataResponse } from '../common/api-response';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversation')
  async getConversation(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.chatService.getConversationSummary(userId));
  }

  @Get('sessions')
  async getSessions(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.chatService.getSessionsSummary(userId));
  }

  @Get('events')
  subscribeEvents(@CurrentUserId() userId: bigint, @Res() response: any) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders?.();
    response.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const unsubscribe = this.chatService.subscribe(userId, (event) => {
      response.write(`event: ${event.type}\ndata: ${JSON.stringify(this.serializeValue(event))}\n\n`);
    });
    const heartbeat = setInterval(() => {
      response.write(`event: heartbeat\ndata: ${JSON.stringify({ now: new Date().toISOString() })}\n\n`);
    }, 25000);

    response.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      response.end();
    });
  }

  @Get('messages')
  async listMessages(
    @CurrentUserId() userId: bigint,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return dataResponse(await this.chatService.listMessages(userId, cursor, limit ? Number(limit) : undefined));
  }

  @Post('messages')
  async sendMessage(@Body() body: Parameters<ChatService['sendMessage']>[1], @CurrentUserId() userId: bigint) {
    return dataResponse(await this.chatService.sendMessage(userId, body));
  }

  @Patch('messages/:id/recall')
  async recallMessage(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: bigint) {
    return dataResponse(await this.chatService.recallMessage(userId, id));
  }

  @Patch('read')
  async markAsRead(@CurrentUserId() userId: bigint) {
    return dataResponse(await this.chatService.markAsRead(userId));
  }

  private serializeValue(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [this.toSnakeCase(key), this.serializeValue(entryValue)]),
      );
    }

    return value;
  }

  private toSnakeCase(key: string) {
    return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
