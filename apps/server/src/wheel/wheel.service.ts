import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WheelService {
  constructor(private readonly prisma: PrismaService) {}

  async listOptions(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return [];
    }

    return this.prisma.wheelOption.findMany({
      where: {
        relationshipId: relationship.id,
        status: 'active',
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createOption(payload: { title?: string; sort_order?: number }, userId: bigint) {
    const relationship = await this.requireActiveRelationshipForUser(userId);
    const title = payload.title?.trim();

    if (!title) {
      throw new BadRequestException('option title is required');
    }
    if (title.length > 64) {
      throw new BadRequestException('option title is too long');
    }

    const existing = await this.prisma.wheelOption.findFirst({
      where: {
        relationshipId: relationship.id,
        status: 'active',
        title,
      },
    });
    if (existing) {
      throw new BadRequestException('option already exists');
    }

    const count = await this.prisma.wheelOption.count({
      where: {
        relationshipId: relationship.id,
        status: 'active',
      },
    });

    return this.prisma.wheelOption.create({
      data: {
        relationshipId: relationship.id,
        creatorUserId: userId,
        title,
        sortOrder: payload.sort_order ?? count,
      },
    });
  }

  async deleteOption(id: number, userId: bigint) {
    const option = await this.prisma.wheelOption.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!option || option.status !== 'active') {
      throw new NotFoundException('option not found');
    }
    await this.ensureRelationshipMember(userId, option.relationshipId);

    await this.prisma.wheelOption.update({
      where: {
        id: option.id,
      },
      data: {
        status: 'deleted',
      },
    });

    return { id };
  }

  async spin(userId: bigint) {
    const relationship = await this.requireActiveRelationshipForUser(userId);
    const options = await this.prisma.wheelOption.findMany({
      where: {
        relationshipId: relationship.id,
        status: 'active',
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (options.length === 0) {
      throw new BadRequestException('wheel options are required');
    }

    const selected = options[Math.floor(Math.random() * options.length)];
    return this.prisma.wheelOption.update({
      where: {
        id: selected.id,
      },
      data: {
        selectedCount: {
          increment: 1,
        },
        lastSelectedAt: new Date(),
      },
    });
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

  private async ensureRelationshipMember(userId: bigint, relationshipId: bigint) {
    const relationship = await this.prisma.coupleRelationship.findUnique({
      where: {
        id: relationshipId,
      },
    });

    if (!relationship || (relationship.userAId !== userId && relationship.userBId !== userId)) {
      throw new ForbiddenException('current user is not relationship member');
    }
  }
}
