import { ResourceNotFoundException } from '@common/exceptions/resource-not-found';
import { TActiveMembershipPayload } from '@common/guards/active-membership.guard';
import { TimezoneService } from '@common/timezone/timezone.service';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ENClubFeatureStatus,
  ENFeature,
} from '@prisma/client';

@Injectable()
export class FeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezoneService: TimezoneService,
  ) {}

  public async getFeatures() {
    return await this.prisma.feature.findMany();
  }

  public async getFeature(clubId: string, featureId: string) {
    return await this.prisma.clubFeature.findUnique({
      where: { clubId_featureId: { clubId, featureId } },
    });
  }

  public async getClubFeatures(clubId: string) {
    return await this.prisma.clubFeature.findMany({
      where: { clubId },
    });
  }

  public async enableFeature(
    featureCode: ENFeature,
    activeMembership: TActiveMembershipPayload,
  ) {
    const feature = await this.prisma.feature.findFirst({
      where: { code: featureCode, isActive: true },
    });
    if (!feature)
      throw new ResourceNotFoundException(`Feature ${featureCode} not found`);

    const clubFeature = await this.prisma.clubFeature.findUnique({
      where: {
        clubId_featureId: {
          clubId: activeMembership.clubId,
          featureId: feature.id,
        },
      },
    });
    if (!clubFeature)
      throw new ResourceNotFoundException(
        `Feature ${featureCode} is not provisioned for this club`,
      );

    if (clubFeature.status === ENClubFeatureStatus.ENABLED)
      throw new ForbiddenException(
        `Feature ${featureCode} already enabled for this club`,
      );

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.clubFeature.update({
        where: { id: clubFeature.id },
        data: {
          status: ENClubFeatureStatus.ENABLED,
          enabledAt: this.timezoneService.nowUtc(),
          enabledById: activeMembership.id,
        },
      });

      return updated;
    });
  }

  public async disableFeature(
    featureCode: ENFeature,
    activeMembership: TActiveMembershipPayload,
  ) {
    const feature = await this.prisma.feature.findFirst({
      where: { code: featureCode, isActive: true },
    });
    if (!feature)
      throw new ResourceNotFoundException(`Feature ${featureCode} not found`);

    if (feature.isCore)
      throw new ForbiddenException(
        `Feature ${featureCode} is core and cannot be disabled`,
      );

    const clubFeature = await this.prisma.clubFeature.findUnique({
      where: {
        clubId_featureId: {
          clubId: activeMembership.clubId,
          featureId: feature.id,
        },
      },
    });
    if (!clubFeature)
      throw new ResourceNotFoundException(
        `Feature ${featureCode} is not provisioned for this club`,
      );

    if (clubFeature.status === ENClubFeatureStatus.DISABLED)
      throw new ForbiddenException(
        `Feature ${featureCode} already disabled for this club`,
      );

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.clubFeature.update({
        where: { id: clubFeature.id },
        data: {
          status: ENClubFeatureStatus.DISABLED,
          enabledAt: null,
          enabledById: null,
        },
      });

      return updated;
    });
  }
}
