import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Menu } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  getBootstrapData() {
    return {
      message: 'LoveMenu menus module is ready.',
    };
  }

  async listCategoriesForUser(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return [];
    }

    return this.prisma.menuCategory.findMany({
      where: {
        relationshipId: relationship.id,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async createCategory(payload: {
    relationship_id?: number;
    name: string;
    sort_order?: number;
    status?: string;
  }, userId: bigint) {
    const relationship = await this.requirePublisherRelationship(userId);
    return this.prisma.menuCategory.create({
      data: {
        relationshipId: relationship.id,
        publisherUserId: userId,
        name: payload.name,
        sortOrder: payload.sort_order,
        status: payload.status ?? 'active',
      },
    });
  }

  async updateCategory(id: number, payload: Partial<{ name: string; sort_order: number; status: string }>, userId: bigint) {
    const category = await this.ensureCategoryExists(id);
    await this.ensurePublisherCanEdit(userId, category.relationshipId);

    return this.prisma.menuCategory.update({
      where: {
        id: BigInt(id),
      },
      data: {
        name: payload.name,
        sortOrder: payload.sort_order,
        status: payload.status,
      },
    });
  }

  async deleteCategory(id: number, userId: bigint) {
    const category = await this.ensureCategoryExists(id);
    await this.ensurePublisherCanEdit(userId, category.relationshipId);

    await this.prisma.menuCategory.delete({
      where: {
        id: BigInt(id),
      },
    });

    return { id };
  }

  async listMenusForUser(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      return [];
    }

    const menus = await this.prisma.menu.findMany({
      where: {
        relationshipId: relationship.id,
        status: 'active',
      },
      orderBy: {
        heatScore: 'desc',
      },
    });
    return menus.map((menu) => this.toMenuResponse(menu));
  }

  async getMenu(id: number, userId?: bigint) {
    const menu = await this.prisma.menu.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!menu) {
      throw new NotFoundException('menu not found');
    }

    if (userId) {
      await this.ensureRelationshipMember(userId, menu.relationshipId);
    }

    return this.toMenuResponse(menu);
  }

  async createMenu(payload: {
    relationship_id?: number;
    category_id?: number | null;
    title: string;
    description?: string | null;
    cover_image_url?: string | null;
    is_published?: boolean;
    is_limited?: boolean;
    available_count?: number;
    remark?: string | null;
  }, userId: bigint) {
    const relationship = await this.requirePublisherRelationship(userId);
    const menu = await this.prisma.menu.create({
      data: {
        relationshipId: relationship.id,
        publisherUserId: userId,
        categoryId: payload.category_id ? BigInt(payload.category_id) : null,
        title: payload.title,
        description: payload.description,
        coverImageUrl: payload.cover_image_url,
        isPublished: payload.is_published ?? false,
        isLimited: payload.is_limited ?? false,
        availableCount: payload.available_count ?? 0,
        remark: payload.remark,
      },
    });
    return this.toMenuResponse(menu);
  }

  async updateMenu(
    id: number,
    payload: Partial<{
      category_id: number | null;
      title: string;
      description: string | null;
      cover_image_url: string | null;
      is_published: boolean;
      is_limited: boolean;
      available_count: number;
      remark: string | null;
      status: string;
    }>,
    userId: bigint,
  ) {
    const menu = await this.prisma.menu.findUnique({
      where: {
        id: BigInt(id),
      },
    });
    if (!menu) {
      throw new NotFoundException('menu not found');
    }
    await this.ensureRelationshipMember(userId, menu.relationshipId);
    await this.ensurePublisherCanEdit(userId, menu.relationshipId);

    const updatedMenu = await this.prisma.menu.update({
      where: {
        id: BigInt(id),
      },
      data: {
        categoryId: payload.category_id ? BigInt(payload.category_id) : payload.category_id,
        title: payload.title,
        description: payload.description,
        coverImageUrl: payload.cover_image_url,
        isPublished: payload.is_published,
        isLimited: payload.is_limited,
        availableCount: payload.available_count,
        remark: payload.remark,
        status: payload.status,
      },
    });
    return this.toMenuResponse(updatedMenu);
  }

  toMenuResponse(menu: Menu) {
    const coverImageObjectKey = this.uploadsService.resolveObjectKey(menu.coverImageUrl);

    return {
      ...menu,
      coverImageUrl: this.uploadsService.signReadUrl(menu.coverImageUrl),
      coverImageObjectKey,
    };
  }

  private async ensureCategoryExists(id: number) {
    const category = await this.prisma.menuCategory.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!category) {
      throw new NotFoundException('category not found');
    }

    return category;
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

  private async requirePublisherRelationship(userId: bigint) {
    const relationship = await this.getActiveRelationshipForUser(userId);
    if (!relationship) {
      throw new BadRequestException('active relationship not found');
    }
    if (relationship.publisherUserId !== userId) {
      throw new ForbiddenException('only publisher can edit menus');
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
    return relationship;
  }

  private async ensurePublisherCanEdit(userId: bigint, relationshipId: bigint) {
    const relationship = await this.ensureRelationshipMember(userId, relationshipId);
    if (relationship.publisherUserId !== userId) {
      throw new ForbiddenException('only publisher can edit menus');
    }
  }
}
