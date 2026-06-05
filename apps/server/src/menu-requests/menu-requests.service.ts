import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MenuRequest } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type MenuRequestStatus = 'pending' | 'accepted' | 'rejected';

type CreateMenuRequestPayload = {
  title: string;
  description?: string | null;
  suggested_category_name?: string | null;
  remark?: string | null;
};

type UpdateMenuRequestStatusPayload = {
  status: MenuRequestStatus;
  remark?: string | null;
  create_menu?: boolean;
  converted_menu_id?: number | null;
};

function toBigIntId(id: number) {
  return BigInt(id);
}

@Injectable()
export class MenuRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return [];
    }

    const requests = await this.prisma.menuRequest.findMany({
      where: {
        relationshipId: relationship.id,
        OR: [{ consumerUserId: userId }, { publisherUserId: userId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => this.toMenuRequestResponse(request));
  }

  async get(id: number, userId: bigint) {
    const request = await this.requireMenuRequest(id);
    await this.ensureRequestMember(request, userId);
    return this.toMenuRequestResponse(request);
  }

  async create(payload: CreateMenuRequestPayload, consumerUserId: bigint) {
    const relationship = await this.requireConsumerRelationship(consumerUserId);
    const title = payload.title?.trim();

    if (!title) {
      throw new BadRequestException('title is required');
    }

    const request = await this.prisma.menuRequest.create({
      data: {
        relationshipId: relationship.id,
        consumerUserId,
        publisherUserId: relationship.publisherUserId,
        title,
        description: payload.description?.trim() || null,
        suggestedCategoryName: payload.suggested_category_name?.trim() || null,
        remark: payload.remark?.trim() || null,
        status: 'pending',
      },
    });

    return this.toMenuRequestResponse(request);
  }

  async updateStatus(id: number, payload: UpdateMenuRequestStatusPayload, publisherUserId: bigint) {
    const request = await this.requireMenuRequest(id);
    const relationship = await this.ensureRequestMember(request, publisherUserId);

    if (relationship.publisherUserId !== publisherUserId) {
      throw new ForbiddenException('only publisher can handle menu request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('menu request has already been handled');
    }

    if (!['accepted', 'rejected'].includes(payload.status)) {
      throw new BadRequestException('status must be accepted or rejected');
    }

    const handledAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      let convertedMenuId = request.convertedMenuId;

      if (payload.status === 'accepted' && payload.converted_menu_id) {
        const menu = await tx.menu.findUnique({
          where: {
            id: BigInt(payload.converted_menu_id),
          },
        });
        if (!menu || menu.relationshipId !== request.relationshipId || menu.publisherUserId !== publisherUserId) {
          throw new BadRequestException('converted menu is invalid');
        }
        convertedMenuId = menu.id;
      } else if (payload.status === 'accepted' && payload.create_menu !== false) {
        const menu = await tx.menu.create({
          data: {
            relationshipId: request.relationshipId,
            publisherUserId,
            categoryId: null,
            title: request.title,
            description: request.description,
            isPublished: false,
            isLimited: true,
            availableCount: 1,
            remark: request.remark,
          },
        });
        convertedMenuId = menu.id;
      }

      const updatedRequest = await tx.menuRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: payload.status,
          handledByUserId: publisherUserId,
          handledAt,
          convertedMenuId,
          remark: payload.remark?.trim() || request.remark,
        },
      });

      return this.toMenuRequestResponse(updatedRequest);
    });
  }

  private async requireMenuRequest(id: number) {
    const request = await this.prisma.menuRequest.findUnique({
      where: {
        id: toBigIntId(id),
      },
    });

    if (!request) {
      throw new NotFoundException('menu request not found');
    }

    return request;
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
      throw new ForbiddenException('only consumer can create menu request');
    }
    return relationship;
  }

  private async ensureRequestMember(request: MenuRequest, userId: bigint) {
    const relationship = await this.prisma.coupleRelationship.findUnique({
      where: {
        id: request.relationshipId,
      },
    });

    if (!relationship || (relationship.userAId !== userId && relationship.userBId !== userId)) {
      throw new ForbiddenException('current user is not relationship member');
    }

    return relationship;
  }

  private toMenuRequestResponse(request: MenuRequest) {
    return {
      ...request,
    };
  }
}
