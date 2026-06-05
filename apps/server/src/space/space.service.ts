import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

type SpaceImagePayload = {
  image_url: string;
};

type CreateDailyPostPayload = {
  content_text?: string | null;
  images?: SpaceImagePayload[];
  record_date?: string | null;
};

@Injectable()
export class SpaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async listPosts(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return [];
    }

    const posts = await this.prisma.spacePost.findMany({
      where: {
        relationshipId: relationship.id,
        status: 'active',
      },
      orderBy: {
        postedAt: 'desc',
      },
    });
    const postIds = posts.map((post) => post.id);
    const images =
      postIds.length > 0
        ? await this.prisma.spacePostImage.findMany({
            where: {
              postId: {
                in: postIds,
              },
            },
            orderBy: {
              sortOrder: 'asc',
            },
          })
        : [];

    return posts.map((post) => ({
      ...post,
      images: this.signImages(images.filter((image) => image.postId === post.id)),
    }));
  }

  async getStats(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return {
        togetherDays: null,
        publishedMenuCount: 0,
        completedOrderCount: 0,
        sweetIndex: 0,
        topMenus: [],
        weeklySweetness: [0, 0, 0, 0, 0, 0, 0],
        latestMoment: null,
      };
    }

    const today = new Date();
    const weekStart = new Date(today);
    const weekday = today.getDay() || 7;
    weekStart.setDate(today.getDate() - weekday + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [publishedMenuCount, completedOrderCount, topMenus, weekOrders, weekPosts, latestPost] = await Promise.all([
      this.prisma.menu.count({
        where: {
          relationshipId: relationship.id,
          status: 'active',
          isPublished: true,
        },
      }),
      this.prisma.order.count({
        where: {
          relationshipId: relationship.id,
          status: 'completed',
        },
      }),
      this.prisma.menu.findMany({
        where: {
          relationshipId: relationship.id,
          status: 'active',
          isPublished: true,
        },
        orderBy: [{ completedOrderCount: 'desc' }, { heatScore: 'desc' }, { updatedAt: 'desc' }],
        take: 3,
      }),
      this.prisma.order.findMany({
        where: {
          relationshipId: relationship.id,
          status: 'completed',
          completedAt: {
            gte: weekStart,
          },
        },
        select: {
          completedAt: true,
        },
      }),
      this.prisma.spacePost.findMany({
        where: {
          relationshipId: relationship.id,
          status: 'active',
          postedAt: {
            gte: weekStart,
          },
        },
        select: {
          postedAt: true,
        },
      }),
      this.prisma.spacePost.findFirst({
        where: {
          relationshipId: relationship.id,
          status: 'active',
        },
        orderBy: {
          postedAt: 'desc',
        },
      }),
    ]);

    const weeklySweetness = Array.from({ length: 7 }, () => 0);
    const addToWeekBucket = (date: Date | null) => {
      if (!date) {
        return;
      }
      const bucket = Math.floor((date.getTime() - weekStart.getTime()) / 86400000);
      if (bucket >= 0 && bucket < weeklySweetness.length) {
        weeklySweetness[bucket] += 1;
      }
    };

    weekOrders.forEach((order) => addToWeekBucket(order.completedAt));
    weekPosts.forEach((post) => addToWeekBucket(post.postedAt));

    const weekEventCount = weeklySweetness.reduce((total, value) => total + value, 0);
    const sweetIndex =
      completedOrderCount === 0 && publishedMenuCount === 0
        ? 0
        : Math.min(99, 60 + weekEventCount * 6 + Math.min(completedOrderCount, 10) * 2);

    return {
      togetherDays: relationship.togetherSince
        ? Math.max(1, Math.floor((Date.now() - relationship.togetherSince.getTime()) / 86400000))
        : null,
      publishedMenuCount,
      completedOrderCount,
      sweetIndex,
      topMenus: topMenus.map((menu) => ({
        id: menu.id,
        title: menu.title,
        note: menu.description || menu.remark || `${menu.completedOrderCount} 次完成点单`,
        count: menu.completedOrderCount,
      })),
      weeklySweetness,
      latestMoment: latestPost ? await this.getPostWithImages(latestPost.id, this.prisma) : null,
    };
  }

  async createDailyPost(payload: CreateDailyPostPayload, userId: bigint) {
    const relationship = await this.requireActiveRelationshipForUser(userId);
    const contentText = payload.content_text?.trim() || null;
    const imageUrls = this.normalizeImageUrls(payload.images);

    if (!contentText && imageUrls.length === 0) {
      throw new BadRequestException('post content or images are required');
    }

    const postedAt = this.parseRecordDate(payload.record_date);

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.spacePost.create({
        data: {
          relationshipId: relationship.id,
          creatorUserId: userId,
          postType: 'daily_post',
          contentText,
          recordDate: postedAt,
          postedAt,
        },
      });

      if (imageUrls.length > 0) {
        await tx.spacePostImage.createMany({
          data: imageUrls.map((imageUrl, index) => ({
            postId: post.id,
            imageUrl,
            sortOrder: index,
          })),
        });
      }

      return this.getPostWithImages(post.id, tx);
    });
  }

  async createOrderFeedbackPost(
    payload: {
      order_id: number;
      content_text?: string | null;
      images?: SpaceImagePayload[];
    },
    userId: bigint,
  ) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(payload.order_id),
      },
    });

    if (!order) {
      throw new BadRequestException('order not found');
    }
    if (order.consumerUserId !== userId) {
      throw new ForbiddenException('only order consumer can submit feedback');
    }
    if (order.status !== 'completed') {
      throw new BadRequestException('only completed orders can be reviewed');
    }

    const contentText = payload.content_text?.trim() || null;
    const imageUrls = this.normalizeImageUrls(payload.images);
    if (!contentText && imageUrls.length === 0) {
      throw new BadRequestException('feedback content or images are required');
    }

    const menu = await this.prisma.menu.findUnique({
      where: {
        id: order.menuId,
      },
    });
    const postedAt = order.completedAt ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.orderFeedback.create({
        data: {
          orderId: order.id,
          relationshipId: order.relationshipId,
          consumerUserId: userId,
          contentText,
        },
      });

      if (imageUrls.length > 0) {
        await tx.orderFeedbackImage.createMany({
          data: imageUrls.map((imageUrl, index) => ({
            feedbackId: feedback.id,
            imageUrl,
            sortOrder: index,
          })),
        });
      }

      const post = await tx.spacePost.create({
        data: {
          relationshipId: order.relationshipId,
          creatorUserId: userId,
          postType: 'order_feedback',
          sourceOrderId: order.id,
          sourceFeedbackId: feedback.id,
          title: menu?.title ?? '订单反馈',
          contentText,
          recordDate: postedAt,
          postedAt,
        },
      });

      if (imageUrls.length > 0) {
        await tx.spacePostImage.createMany({
          data: imageUrls.map((imageUrl, index) => ({
            postId: post.id,
            imageUrl,
            sortOrder: index,
          })),
        });
      }

      return {
        feedback,
        post: await this.getPostWithImages(post.id, tx),
      };
    });
  }

  private async getPostWithImages(postId: bigint, client: Pick<PrismaService, 'spacePost' | 'spacePostImage'>) {
    const post = await client.spacePost.findUnique({
      where: {
        id: postId,
      },
    });
    const images = await client.spacePostImage.findMany({
      where: {
        postId,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return {
      ...post,
      images: this.signImages(images),
    };
  }

  private signImages<T extends { imageUrl: string }>(images: T[]) {
    return images.map((image) => ({
      ...image,
      imageUrl: this.uploadsService.signReadUrl(image.imageUrl) ?? image.imageUrl,
    }));
  }

  private normalizeImageUrls(images: SpaceImagePayload[] | null | undefined) {
    return (images ?? [])
      .map((image) => image.image_url?.trim())
      .filter((imageUrl): imageUrl is string => Boolean(imageUrl))
      .slice(0, 9);
  }

  private parseRecordDate(value: string | null | undefined) {
    if (!value) {
      return new Date();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('invalid record date');
    }
    return date;
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

  private async requireActiveRelationshipForUser(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      throw new BadRequestException('active relationship not found');
    }
    return relationship;
  }
}
