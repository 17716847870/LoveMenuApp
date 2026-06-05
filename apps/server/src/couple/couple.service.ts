import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AnniversariesService } from '../anniversaries/anniversaries.service';
import { ConfirmRelationshipRoleDto, UpdateRelationshipRoleDto } from './dto';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function toBigIntId(id: number) {
  return BigInt(id);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

@Injectable()
export class CoupleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anniversariesService: AnniversariesService,
  ) {}

  async createInvite(inviterUserId: bigint) {
    const inviter = await this.prisma.user.findUnique({
      where: {
        id: inviterUserId,
      },
    });

    if (!inviter) {
      throw new NotFoundException('inviter user not found');
    }

    if (inviter.preferredRole !== 'consumer') {
      throw new BadRequestException('only consumers can create invites');
    }

    if (!inviter.gender) {
      throw new BadRequestException('consumer gender is required before creating invites');
    }

    await this.ensureUserCanBind(inviterUserId);

    await this.prisma.coupleInvite.updateMany({
      where: {
        inviterUserId,
        status: 'pending',
      },
      data: {
        status: 'expired',
      },
    });

    return this.prisma.coupleInvite.create({
      data: {
        inviterUserId,
        inviteCode: await this.generateUniqueInviteCode(),
        status: 'pending',
        expiredAt: addDays(new Date(), 7),
      },
    });
  }

  async bindByInvite(inviteCode: string, usedByUserId: bigint) {
    const invite = await this.prisma.coupleInvite.findUnique({
      where: {
        inviteCode,
      },
    });

    if (!invite) {
      throw new NotFoundException('invite not found');
    }

    if (invite.status !== 'pending') {
      throw new ConflictException('invite is not pending');
    }

    if (invite.expiredAt && invite.expiredAt.getTime() < Date.now()) {
      await this.prisma.coupleInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: 'expired',
        },
      });
      throw new ConflictException('invite expired');
    }

    if (invite.inviterUserId === usedByUserId) {
      throw new BadRequestException('cannot bind yourself');
    }

    const usedByUser = await this.prisma.user.findUnique({
      where: {
        id: usedByUserId,
      },
    });
    const inviter = await this.prisma.user.findUnique({
      where: {
        id: invite.inviterUserId,
      },
    });

    if (!usedByUser || !inviter) {
      throw new NotFoundException('user not found');
    }

    if (inviter.preferredRole !== 'consumer') {
      throw new BadRequestException('invite must be created by a consumer');
    }

    if (usedByUser.preferredRole !== 'publisher') {
      throw new BadRequestException('only publishers can bind with an invite');
    }

    if (!usedByUser.gender || !inviter.gender) {
      throw new BadRequestException('both users must select gender before binding');
    }

    if (
      !['male', 'female'].includes(usedByUser.gender) ||
      !['male', 'female'].includes(inviter.gender) ||
      usedByUser.gender === inviter.gender
    ) {
      throw new BadRequestException('binding requires one male and one female user');
    }

    await this.ensureUserCanBind(invite.inviterUserId);
    await this.ensureUserCanBind(usedByUserId);

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const relationship = await tx.coupleRelationship.create({
        data: {
          userAId: invite.inviterUserId,
          userBId: usedByUserId,
          publisherUserId: usedByUserId,
          consumerUserId: invite.inviterUserId,
          roleConfirmationStatus: 'pending',
          roleProposerUserId: null,
          proposedPublisherUserId: null,
          proposedConsumerUserId: null,
          status: 'active',
          boundAt: now,
        },
      });

      await tx.coupleInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: 'used',
          usedByUserId,
          usedAt: now,
        },
      });

      return relationship;
    });
  }

  async getRelationship(id: number, viewerUserId?: bigint) {
    const relationship = await this.prisma.coupleRelationship.findUnique({
      where: {
        id: toBigIntId(id),
      },
    });

    if (!relationship) {
      throw new NotFoundException('relationship not found');
    }

    if (viewerUserId && relationship.userAId !== viewerUserId && relationship.userBId !== viewerUserId) {
      throw new BadRequestException('current user must be a relationship member');
    }

    return relationship;
  }

  async updateRelationshipRole(id: number, dto: UpdateRelationshipRoleDto, currentUserId: bigint) {
    const relationship = await this.getRelationship(id, currentUserId);
    const publisherUserId = toBigIntId(dto.publisher_user_id);
    const consumerUserId = toBigIntId(dto.consumer_user_id);
    const memberIds = [relationship.userAId, relationship.userBId];

    if (
      publisherUserId === consumerUserId ||
      !memberIds.includes(publisherUserId) ||
      !memberIds.includes(consumerUserId)
    ) {
      throw new BadRequestException('publisher and consumer must be different relationship members');
    }

    const isMatchingPartnerProposal =
      relationship.roleConfirmationStatus === 'pending' &&
      relationship.roleProposerUserId !== currentUserId &&
      relationship.proposedPublisherUserId === publisherUserId &&
      relationship.proposedConsumerUserId === consumerUserId;

    if (isMatchingPartnerProposal) {
      return this.confirmRole(relationship.id, publisherUserId, consumerUserId);
    }

    return this.prisma.coupleRelationship.update({
      where: {
        id: relationship.id,
      },
      data: {
        roleConfirmationStatus: 'pending',
        roleProposerUserId: currentUserId,
        proposedPublisherUserId: publisherUserId,
        proposedConsumerUserId: consumerUserId,
      },
    });
  }

  async confirmRelationshipRole(id: number, dto: ConfirmRelationshipRoleDto, operatorUserId: bigint) {
    const relationship = await this.getRelationship(id, operatorUserId);

    if (relationship.publisherUserId !== operatorUserId) {
      throw new BadRequestException('only publisher can confirm relationship role');
    }

    if (relationship.roleConfirmationStatus === 'confirmed') {
      return relationship;
    }

    const publisherUserId = toBigIntId(dto.publisher_user_id);
    const consumerUserId = toBigIntId(dto.consumer_user_id);
    const memberIds = [relationship.userAId, relationship.userBId];

    if (
      publisherUserId === consumerUserId ||
      !memberIds.includes(publisherUserId) ||
      !memberIds.includes(consumerUserId)
    ) {
      throw new BadRequestException('publisher and consumer must be different relationship members');
    }

    const updatedRelationship = await this.prisma.coupleRelationship.update({
      where: {
        id: relationship.id,
      },
      data: {
        publisherUserId,
        consumerUserId,
        roleConfirmationStatus: 'confirmed',
        togetherSince: new Date(dto.together_since),
        roleProposerUserId: null,
        proposedPublisherUserId: null,
        proposedConsumerUserId: null,
      },
    });

    await this.anniversariesService.ensureTogetherAnniversary(
      updatedRelationship.id,
      operatorUserId,
      new Date(dto.together_since),
    );

    return updatedRelationship;
  }

  async unbindRelationship(id: number, requestedByUserId: bigint) {
    const relationship = await this.getRelationship(id, requestedByUserId);

    return this.prisma.coupleRelationship.update({
      where: {
        id: relationship.id,
      },
      data: {
        status: 'unbound',
        unboundAt: new Date(),
      },
    });
  }

  private async confirmRole(relationshipId: bigint, publisherUserId: bigint, consumerUserId: bigint) {
    return this.prisma.coupleRelationship.update({
      where: {
        id: relationshipId,
      },
      data: {
        publisherUserId,
        consumerUserId,
        roleConfirmationStatus: 'confirmed',
        roleProposerUserId: null,
        proposedPublisherUserId: null,
        proposedConsumerUserId: null,
      },
    });
  }

  private async ensureUserCanBind(userId: bigint) {
    const activeRelationship = await this.prisma.coupleRelationship.findFirst({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });

    if (activeRelationship) {
      throw new ConflictException('user already has active relationship');
    }
  }

  private async generateUniqueInviteCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inviteCode = Array.from({ length: 6 }, () =>
        INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)],
      ).join('');
      const existingInvite = await this.prisma.coupleInvite.findUnique({
        where: {
          inviteCode,
        },
      });

      if (!existingInvite) {
        return inviteCode;
      }
    }

    throw new ConflictException('failed to generate invite code');
  }
}
