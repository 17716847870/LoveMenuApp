import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatMessage } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

type MessageType = 'text' | 'emoji' | 'image' | 'voice';
type MentionType = 'menu' | 'order' | 'wish';

type SendMessagePayload = {
  message_type?: MessageType;
  text_content?: string | null;
  reply_to_message_id?: number | null;
  asset?: {
    asset_type?: 'image' | 'voice';
    asset_url?: string;
    duration_seconds?: number | null;
    file_size?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  mention?: {
    ref_type?: MentionType;
    ref_id?: number;
  } | null;
};

type ChatRealtimeEvent =
  | {
      type: 'message.created' | 'message.recalled';
      message: Awaited<ReturnType<ChatService['toMessageResponse']>>;
    }
  | {
      type: 'messages.read';
      readerUserId: bigint;
      conversationId: bigint;
    };

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@Injectable()
export class ChatService {
  private readonly subscribers = new Map<string, Set<(event: ChatRealtimeEvent) => void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  subscribe(userId: bigint, emit: (event: ChatRealtimeEvent) => void) {
    const key = userId.toString();
    const userSubscribers = this.subscribers.get(key) ?? new Set<(event: ChatRealtimeEvent) => void>();
    userSubscribers.add(emit);
    this.subscribers.set(key, userSubscribers);

    return () => {
      userSubscribers.delete(emit);
      if (userSubscribers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  async getConversationSummary(userId: bigint) {
    const relationship = await this.requireActiveRelationship(userId);
    const conversation = await this.getOrCreateConversation(relationship);
    const lastMessage = conversation.lastMessageId
      ? await this.prisma.chatMessage.findUnique({ where: { id: conversation.lastMessageId } })
      : await this.prisma.chatMessage.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { sentAt: 'desc' },
        });

    return {
      ...conversation,
      partnerUserId: this.getPartnerUserId(relationship, userId),
      unreadCount: await this.getUnreadCount(conversation.id, userId),
      lastMessage: lastMessage ? await this.toMessageResponse(lastMessage) : null,
    };
  }

  async getSessionsSummary(userId: bigint) {
    const relationship = await this.requireActiveRelationship(userId);
    const conversation = await this.getConversationSummary(userId);
    const partnerUserId = this.getPartnerUserId(relationship, userId);
    const partner = await this.prisma.user.findUnique({ where: { id: partnerUserId } });
    const now = new Date();
    const partnerOnline =
      Boolean(this.subscribers.get(partnerUserId.toString())?.size) ||
      Boolean(partner?.lastLoginAt && now.getTime() - partner.lastLoginAt.getTime() <= 2 * 60 * 1000);

    const [latestMenuRequest, pendingMenuRequestCount, upcomingAnniversary] = await Promise.all([
      this.prisma.menuRequest.findFirst({
        where: {
          relationshipId: relationship.id,
          OR: [{ consumerUserId: userId }, { publisherUserId: userId }],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.menuRequest.count({
        where: {
          relationshipId: relationship.id,
          status: 'pending',
          ...(relationship.publisherUserId === userId ? { publisherUserId: userId } : { consumerUserId: userId }),
        },
      }),
      this.prisma.reminder.findFirst({
        where: {
          relationshipId: relationship.id,
          status: 'active',
          nextTriggerAt: { not: null },
          OR: [{ creatorUserId: userId }, { permissionType: { not: 'private' } }],
        },
        orderBy: { nextTriggerAt: 'asc' },
      }),
    ]);

    return {
      conversation,
      partnerPresence: {
        isOnline: partnerOnline,
        lastSeenAt: partner?.lastLoginAt ?? null,
        label: partnerOnline ? '在线' : this.formatLastSeenLabel(partner?.lastLoginAt ?? null, now),
      },
      secondarySessions: [
        {
          id: 'menu-requests',
          title: '菜单申请',
          preview: latestMenuRequest
            ? this.getMenuRequestPreview(latestMenuRequest.status, latestMenuRequest.title)
            : '还没有新的点单心愿。',
          meta: latestMenuRequest ? this.formatSessionMeta(latestMenuRequest.createdAt, now) : '',
          unreadCount: pendingMenuRequestCount,
          route: 'ApplicationList',
          icon: 'bell',
        },
        {
          id: 'anniversaries',
          title: '纪念日提醒',
          preview: upcomingAnniversary
            ? this.getAnniversaryPreview(upcomingAnniversary.title, upcomingAnniversary.nextTriggerAt, now)
            : '还没有即将到来的纪念日。',
          meta: upcomingAnniversary?.nextTriggerAt
            ? this.formatSessionMeta(upcomingAnniversary.nextTriggerAt, now)
            : '',
          unreadCount: 0,
          route: 'Anniversaries',
          icon: 'heart',
        },
      ],
    };
  }

  async listMessages(userId: bigint, cursor?: string, limit = 40) {
    const relationship = await this.requireActiveRelationship(userId);
    const conversation = await this.getOrCreateConversation(relationship);
    const take = Math.min(Math.max(limit || 40, 1), 80);
    const cursorId = cursor && /^\d+$/.test(cursor) ? BigInt(cursor) : null;
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(cursorId ? { id: { lt: cursorId } } : {}),
      },
      orderBy: { id: 'desc' },
      take: take + 1,
    });
    const hasMore = messages.length > take;
    const page = messages.slice(0, take);
    const ordered = [...page].reverse();

    return {
      items: await Promise.all(ordered.map((message) => this.toMessageResponse(message))),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
      hasMore,
    };
  }

  async sendMessage(userId: bigint, payload: SendMessagePayload) {
    const relationship = await this.requireActiveRelationship(userId);
    const conversation = await this.getOrCreateConversation(relationship);
    const receiverUserId = this.getPartnerUserId(relationship, userId);
    const messageType = payload.message_type;
    const textContent = payload.text_content?.trim() || null;

    if (!messageType || !['text', 'emoji', 'image', 'voice'].includes(messageType)) {
      throw new BadRequestException('message_type is invalid');
    }
    if ((messageType === 'text' || messageType === 'emoji') && !textContent && !payload.mention) {
      throw new BadRequestException('text_content is required');
    }
    if ((messageType === 'image' || messageType === 'voice') && !payload.asset?.asset_url) {
      throw new BadRequestException('asset_url is required');
    }

    const replyToMessageId = payload.reply_to_message_id ? BigInt(payload.reply_to_message_id) : null;
    if (replyToMessageId) {
      const replyTo = await this.prisma.chatMessage.findUnique({ where: { id: replyToMessageId } });
      if (!replyTo || replyTo.conversationId !== conversation.id) {
        throw new BadRequestException('reply message is invalid');
      }
    }

    if (payload.mention?.ref_type && payload.mention.ref_id) {
      await this.ensureMentionBelongsToRelationship(
        payload.mention.ref_type,
        BigInt(payload.mention.ref_id),
        relationship.id,
      );
    }

    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          relationshipId: relationship.id,
          senderUserId: userId,
          receiverUserId,
          messageType,
          textContent,
          replyToMessageId,
          status: 'sent',
          sentAt: now,
        },
      });

      if (payload.asset?.asset_url && (messageType === 'image' || messageType === 'voice')) {
        await tx.chatMessageAsset.create({
          data: {
            messageId: created.id,
            assetType: payload.asset.asset_type || messageType,
            assetUrl: payload.asset.asset_url,
            durationSeconds: payload.asset.duration_seconds ?? null,
            fileSize: payload.asset.file_size != null ? BigInt(payload.asset.file_size) : null,
            width: payload.asset.width ?? null,
            height: payload.asset.height ?? null,
          },
        });
      }

      if (payload.mention?.ref_type && payload.mention.ref_id) {
        await tx.chatMessageMention.create({
          data: {
            messageId: created.id,
            refType: payload.mention.ref_type,
            refId: BigInt(payload.mention.ref_id),
          },
        });
      }

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageId: created.id,
          lastMessageAt: now,
        },
      });

      return created;
    });

    const response = await this.toMessageResponse(message);
    this.emitToUsers([userId, receiverUserId], {
      type: 'message.created',
      message: response,
    });
    await this.notifyReceiver(receiverUserId, relationship.id, response);

    return response;
  }

  async recallMessage(userId: bigint, id: number) {
    const relationship = await this.requireActiveRelationship(userId);
    const message = await this.prisma.chatMessage.findUnique({ where: { id: BigInt(id) } });
    if (!message || message.relationshipId !== relationship.id) {
      throw new NotFoundException('message not found');
    }
    if (message.senderUserId !== userId) {
      throw new ForbiddenException('only sender can recall message');
    }
    if (message.status === 'recalled') {
      return this.toMessageResponse(message);
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: message.id },
      data: {
        status: 'recalled',
        recalledAt: new Date(),
      },
    });

    const response = await this.toMessageResponse(updated);
    this.emitToUsers([updated.senderUserId, updated.receiverUserId], {
      type: 'message.recalled',
      message: response,
    });

    return response;
  }

  async markAsRead(userId: bigint) {
    const relationship = await this.requireActiveRelationship(userId);
    const conversation = await this.getOrCreateConversation(relationship);
    const now = new Date();
    const result = await this.prisma.chatMessage.updateMany({
      where: {
        conversationId: conversation.id,
        receiverUserId: userId,
        status: { not: 'recalled' },
        readAt: null,
      },
      data: {
        status: 'read',
        readAt: now,
        deliveredAt: now,
      },
    });

    if (result.count > 0) {
      this.emitToUsers([this.getPartnerUserId(relationship, userId)], {
        type: 'messages.read',
        readerUserId: userId,
        conversationId: conversation.id,
      });
    }

    return { readCount: result.count };
  }

  private emitToUsers(userIds: bigint[], event: ChatRealtimeEvent) {
    for (const userId of userIds) {
      const userSubscribers = this.subscribers.get(userId.toString());
      if (!userSubscribers) {
        continue;
      }

      for (const emit of userSubscribers) {
        emit(event);
      }
    }
  }

  private async toMessageResponse(message: ChatMessage) {
    const [assets, mentions, replyToMessage] = await Promise.all([
      this.prisma.chatMessageAsset.findMany({ where: { messageId: message.id } }),
      this.prisma.chatMessageMention.findMany({ where: { messageId: message.id } }),
      message.replyToMessageId ? this.prisma.chatMessage.findUnique({ where: { id: message.replyToMessageId } }) : null,
    ]);

    return {
      ...message,
      assets,
      mentions,
      replyToMessage: replyToMessage
        ? {
            id: replyToMessage.id,
            senderUserId: replyToMessage.senderUserId,
            messageType: replyToMessage.messageType,
            textContent: replyToMessage.textContent,
            status: replyToMessage.status,
          }
        : null,
    };
  }

  private async notifyReceiver(
    receiverUserId: bigint,
    relationshipId: bigint,
    message: Awaited<ReturnType<ChatService['toMessageResponse']>>,
  ) {
    const title = '收到一条新消息';
    const content = this.getMessagePreview(message);
    await this.notificationsService.createAndDispatch({
      userId: receiverUserId,
      relationshipId,
      notificationType: 'chat_message',
      title,
      content,
      targetType: 'message',
      targetId: message.id,
      settingKey: 'chatMessages',
      data: {
        route: 'Chat',
        messageId: message.id.toString(),
      },
    });
  }

  private getMessagePreview(message: Awaited<ReturnType<ChatService['toMessageResponse']>>) {
    if (message.status === 'recalled') {
      return '对方撤回了一条消息';
    }
    if (message.messageType === 'image') {
      return '[图片]';
    }
    if (message.messageType === 'voice') {
      return '[语音]';
    }
    return message.textContent || '[消息]';
  }

  private getMenuRequestPreview(status: string, title: string) {
    if (status === 'pending') {
      return `收到新的点单心愿：${title}`;
    }
    if (status === 'accepted') {
      return `点单心愿已通过：${title}`;
    }
    if (status === 'rejected') {
      return `点单心愿已婉拒：${title}`;
    }
    return title;
  }

  private getAnniversaryPreview(title: string, nextTriggerAt: Date | null, now: Date) {
    if (!nextTriggerAt) {
      return title;
    }
    const days = Math.ceil((startOfDay(nextTriggerAt).getTime() - startOfDay(now).getTime()) / 86400000);
    if (days <= 0) {
      return `${title} 今天提醒`;
    }
    return `距离 ${title} 还有 ${days} 天`;
  }

  private formatSessionMeta(date: Date, now: Date) {
    const dateDay = startOfDay(date).getTime();
    const nowDay = startOfDay(now).getTime();
    const diffDays = Math.round((dateDay - nowDay) / 86400000);
    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (diffDays === -1) {
      return '昨天';
    }
    if (diffDays === 1) {
      return '明天';
    }
    if (Math.abs(diffDays) < 7) {
      return date.toLocaleDateString('zh-CN', { weekday: 'long' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  }

  private formatLastSeenLabel(lastSeenAt: Date | null, now: Date) {
    if (!lastSeenAt) {
      return '离线';
    }
    const diffMinutes = Math.max(1, Math.floor((now.getTime() - lastSeenAt.getTime()) / 60000));
    if (diffMinutes < 60) {
      return `${diffMinutes} 分钟前在线`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} 小时前在线`;
    }
    return lastSeenAt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  }

  private async getUnreadCount(conversationId: bigint, userId: bigint) {
    return this.prisma.chatMessage.count({
      where: {
        conversationId,
        receiverUserId: userId,
        status: { notIn: ['read', 'recalled'] },
      },
    });
  }

  private async getOrCreateConversation(relationship: Awaited<ReturnType<ChatService['requireActiveRelationship']>>) {
    return this.prisma.chatConversation.upsert({
      where: { relationshipId: relationship.id },
      update: {},
      create: {
        relationshipId: relationship.id,
        userAId: relationship.userAId,
        userBId: relationship.userBId,
      },
    });
  }

  private async requireActiveRelationship(userId: bigint) {
    const relationship = await this.prisma.coupleRelationship.findFirst({
      where: {
        status: 'active',
        roleConfirmationStatus: 'confirmed',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!relationship) {
      throw new BadRequestException('active relationship not found');
    }

    return relationship;
  }

  private getPartnerUserId(
    relationship: Awaited<ReturnType<ChatService['requireActiveRelationship']>>,
    userId: bigint,
  ) {
    return relationship.userAId === userId ? relationship.userBId : relationship.userAId;
  }

  private async ensureMentionBelongsToRelationship(refType: MentionType, refId: bigint, relationshipId: bigint) {
    if (refType === 'menu') {
      const menu = await this.prisma.menu.findUnique({ where: { id: refId } });
      if (!menu || menu.relationshipId !== relationshipId) {
        throw new BadRequestException('menu mention is invalid');
      }
      return;
    }

    if (refType === 'order') {
      const order = await this.prisma.order.findUnique({ where: { id: refId } });
      if (!order || order.relationshipId !== relationshipId) {
        throw new BadRequestException('order mention is invalid');
      }
      return;
    }

    const request = await this.prisma.menuRequest.findUnique({ where: { id: refId } });
    if (!request || request.relationshipId !== relationshipId) {
      throw new BadRequestException('wish mention is invalid');
    }
  }
}
