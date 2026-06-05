import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SpaceService } from '../space/space.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaceService: SpaceService,
  ) {}

  getBootstrapData() {
    return {
      message: 'LoveMenu orders module is ready.',
    };
  }

  async createOrder(
    payload: {
      relationship_id?: number;
      menu_id?: number;
      menu_ids?: number[];
      user_remark?: string | null;
    },
    consumerUserId: bigint,
  ) {
    const relationship = await this.requireConsumerRelationship(consumerUserId);
    const requestedMenuIds = payload.menu_ids?.length ? payload.menu_ids : payload.menu_id ? [payload.menu_id] : [];
    const uniqueMenuIds = [...new Set(requestedMenuIds)].map((id) => BigInt(id));

    if (uniqueMenuIds.length === 0) {
      throw new BadRequestException('menu is required');
    }

    const menus = await this.prisma.menu.findMany({
      where: {
        id: {
          in: uniqueMenuIds,
        },
      },
    });

    if (menus.length !== uniqueMenuIds.length) {
      throw new NotFoundException('menu not found');
    }

    for (const menu of menus) {
      if (menu.relationshipId !== relationship.id) {
        throw new BadRequestException('menu is not in current relationship');
      }

      if (menu.isLimited && menu.availableCount <= 0) {
        throw new BadRequestException('menu is sold out');
      }
    }

    const menuById = new Map(menus.map((menu) => [menu.id.toString(), menu]));
    const orderedMenus = uniqueMenuIds
      .map((id) => menuById.get(id.toString()))
      .filter((menu): menu is (typeof menus)[number] => Boolean(menu));
    const primaryMenu = orderedMenus[0];
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      for (const menu of orderedMenus) {
        if (menu.isLimited) {
          await tx.menu.update({
            where: {
              id: menu.id,
            },
            data: {
              availableCount: {
                decrement: 1,
              },
            },
          });
        }
      }

      const order = await tx.order.create({
        data: {
          relationshipId: relationship.id,
          menuId: primaryMenu.id,
          publisherUserId: relationship.publisherUserId,
          consumerUserId,
          orderNo: `LM${Date.now()}${Math.floor(Math.random() * 1000)}`,
          status: 'pending',
          userRemark: payload.user_remark,
          deductedCount: orderedMenus.reduce((total, menu) => total + (menu.isLimited ? 1 : 0), 0),
        },
      });

      await tx.orderItem.createMany({
        data: orderedMenus.map((menu, index) => ({
          orderId: order.id,
          menuId: menu.id,
          titleSnapshot: menu.title,
          coverImageUrlSnapshot: menu.coverImageUrl,
          quantity: 1,
          deductedCount: menu.isLimited ? 1 : 0,
          sortOrder: index,
        })),
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: 'pending',
          operatorUserId: consumerUserId,
          remark: '创建订单',
          createdAt: now,
        },
      });

      return tx.order.findUnique({
        where: {
          id: order.id,
        },
        include: {
          items: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });
    });
  }

  async listOrdersForUser(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return [];
    }

    return this.prisma.order.findMany({
      where: {
        relationshipId: relationship.id,
        OR: [{ publisherUserId: userId }, { consumerUserId: userId }],
      },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getOrder(id: number, userId?: bigint) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('order not found');
    }

    if (userId && order.publisherUserId !== userId && order.consumerUserId !== userId) {
      throw new ForbiddenException('current user is not order member');
    }

    return order;
  }

  async updateOrderStatus(
    id: number,
    payload: {
      status: string;
      remark?: string | null;
    },
    operatorUserId: bigint,
  ) {
    const order = await this.getOrder(id, operatorUserId);
    const changedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: payload.status,
          acceptedAt: payload.status === 'accepted' ? changedAt : order.acceptedAt,
          rejectedAt: payload.status === 'rejected' ? changedAt : order.rejectedAt,
          completedAt: payload.status === 'completed' ? changedAt : order.completedAt,
          cancelledAt: payload.status === 'cancelled' ? changedAt : order.cancelledAt,
          completedByUserId: payload.status === 'completed' ? operatorUserId : order.completedByUserId,
        },
      });

      const orderItems = order.items.length
        ? order.items
        : [
            {
              menuId: order.menuId,
              deductedCount: order.deductedCount,
            },
          ];

      if (payload.status === 'rejected' || payload.status === 'cancelled') {
        for (const item of orderItems) {
          if (item.deductedCount > 0) {
            await tx.menu.update({
              where: {
                id: item.menuId,
              },
              data: {
                availableCount: {
                  increment: item.deductedCount,
                },
              },
            });
          }
        }
      }

      if (payload.status === 'completed') {
        for (const item of orderItems) {
          await tx.menu.update({
            where: {
              id: item.menuId,
            },
            data: {
              heatScore: {
                increment: 1,
              },
              completedOrderCount: {
                increment: 1,
              },
            },
          });
        }
      }

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: payload.status,
          operatorUserId,
          remark: payload.remark,
        },
      });

      return tx.order.findUnique({
        where: {
          id: updatedOrder.id,
        },
        include: {
          items: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });
    });
  }

  async getOrderStatusLogs(orderId: number, userId: bigint) {
    await this.getOrder(orderId, userId);
    return this.prisma.orderStatusLog.findMany({
      where: {
        orderId: BigInt(orderId),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createOrderFeedback(
    orderId: number,
    payload: {
      content_text?: string | null;
      images?: { image_url: string }[];
    },
    userId: bigint,
  ) {
    return this.spaceService.createOrderFeedbackPost(
      {
        order_id: orderId,
        content_text: payload.content_text,
        images: payload.images,
      },
      userId,
    );
  }

  private async getActiveRelationshipForUser(userId: bigint) {
    return this.prisma.coupleRelationship.findFirst({
      where: {
        status: 'active',
        roleConfirmationStatus: 'confirmed',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async requireConsumerRelationship(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      throw new BadRequestException('active relationship not found');
    }
    if (relationship.consumerUserId !== userId) {
      throw new ForbiddenException('only consumer can create orders');
    }
    return relationship;
  }
}
