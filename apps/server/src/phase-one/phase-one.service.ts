import { Injectable, NotFoundException } from '@nestjs/common';
import { Order, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MenusService } from '../menus/menus.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class PhaseOneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menusService: MenusService,
    private readonly uploadsService: UploadsService,
  ) {}

  async getBootstrap(userId: bigint | number) {
    const currentUserId = typeof userId === 'bigint' ? userId : BigInt(userId);
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: currentUserId,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('user not found');
    }

    const relationship = await this.prisma.coupleRelationship.findFirst({
      where: {
        status: 'active',
        OR: [{ userAId: currentUserId }, { userBId: currentUserId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const partnerUserId =
      relationship && relationship.userAId === currentUserId ? relationship.userBId : relationship?.userAId;
    const partnerUser = partnerUserId
      ? await this.prisma.user.findUnique({
          where: {
            id: partnerUserId,
          },
        })
      : null;
    const roleConfirmed = relationship?.roleConfirmationStatus === 'confirmed';

    const [menuCategories, menus, orders, coupleInvites] = await Promise.all([
      relationship && roleConfirmed
        ? this.prisma.menuCategory.findMany({
            where: {
              relationshipId: relationship.id,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          })
        : [],
      relationship && roleConfirmed
        ? this.prisma.menu.findMany({
            where: {
              relationshipId: relationship.id,
              status: 'active',
            },
            orderBy: {
              heatScore: 'desc',
            },
          })
        : [],
      relationship && roleConfirmed
        ? this.prisma.order.findMany({
            where: {
              relationshipId: relationship.id,
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
          })
        : [],
      this.prisma.coupleInvite.findMany({
        where: {
          inviterUserId: currentUserId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    let nextStep = 'select_role';
    if (currentUser.preferredRole && currentUser.gender) {
      nextStep = 'bind';
    }
    if (relationship?.roleConfirmationStatus === 'pending') {
      nextStep = relationship.publisherUserId === currentUserId ? 'role_confirm' : 'wait_role_confirm';
    }
    if (relationship?.roleConfirmationStatus === 'confirmed') {
      nextStep = 'home';
    }

    return {
      currentUser: this.toUserResponse(currentUser),
      partnerUser: this.toUserResponse(partnerUser),
      coupleRelationship: relationship,
      menuCategories,
      menus: menus.map((menu) => this.menusService.toMenuResponse(menu)),
      orders,
      coupleInvites,
      nextStep,
    };
  }

  async getHome(userId: bigint | number) {
    const currentUserId = typeof userId === 'bigint' ? userId : BigInt(userId);
    const bootstrap = await this.getBootstrap(currentUserId);
    const relationship = bootstrap.coupleRelationship;

    if (!relationship || relationship.roleConfirmationStatus !== 'confirmed') {
      return {
        role: null,
        publishedMenuCount: 0,
        pendingOrderCount: 0,
        activeOrderCount: 0,
        completedOrderCount: 0,
        limitedMenuCount: 0,
        pendingWishCount: 0,
        togetherDays: null,
        topMenu: null,
        hottestMenu: null,
        focusOrder: null,
        latestSpacePost: null,
        upcomingAnniversary: null,
      };
    }

    const role = relationship.publisherUserId === currentUserId ? 'publisher' : 'consumer';
    const menus = bootstrap.menus;
    const orders = bootstrap.orders as Order[];
    const publishedMenus = menus.filter((menu) => menu.isPublished);
    const pendingOrders = orders.filter((order) => order.status === 'pending');
    const activeOrders = orders.filter((order) => order.status === 'pending' || order.status === 'accepted');
    const completedOrders = orders.filter((order) => order.status === 'completed');
    const topMenu = publishedMenus[0] ?? null;
    const hottestMenu = [...publishedMenus].sort((a, b) => b.completedOrderCount - a.completedOrderCount)[0] ?? null;
    const pendingWishCount = await this.prisma.menuRequest.count({
      where: {
        relationshipId: relationship.id,
        status: 'pending',
      },
    });
    const latestSpacePost = await this.prisma.spacePost.findFirst({
      where: {
        relationshipId: relationship.id,
        status: 'active',
      },
      orderBy: {
        postedAt: 'desc',
      },
    });
    const upcomingAnniversary = await this.prisma.reminder.findFirst({
      where: {
        relationshipId: relationship.id,
        status: 'active',
        OR: [{ permissionType: { not: 'private' } }, { creatorUserId: currentUserId }],
      },
      orderBy: {
        nextTriggerAt: 'asc',
      },
    });
    const togetherDays = relationship.togetherSince
      ? Math.max(1, Math.floor((Date.now() - relationship.togetherSince.getTime()) / 86400000))
      : null;

    return {
      role,
      publishedMenuCount: publishedMenus.length,
      pendingOrderCount: pendingOrders.length,
      activeOrderCount: activeOrders.length,
      completedOrderCount: completedOrders.length,
      limitedMenuCount: publishedMenus.filter((menu) => menu.isLimited).length,
      pendingWishCount,
      togetherDays,
      topMenu,
      hottestMenu,
      focusOrder: role === 'publisher' ? (pendingOrders[0] ?? null) : (activeOrders[0] ?? null),
      latestSpacePost,
      upcomingAnniversary,
    };
  }

  private toUserResponse(user: User | null) {
    if (!user) {
      return null;
    }

    return {
      ...user,
      avatarUrl: this.uploadsService.signReadUrl(user.avatarUrl),
      avatarObjectKey: this.uploadsService.resolveObjectKey(user.avatarUrl),
    };
  }
}
