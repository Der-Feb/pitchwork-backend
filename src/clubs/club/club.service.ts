import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CreateClubDto, UpdateClubDto } from './club.dto';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found';
import {
  ENClubStatus,
  ENMembershipStatus,
  ENMembershipType,
} from '@prisma/client';
import { parsePrismaError } from '@common/utils/error-handler';
import { TActiveMembershipPayload } from '@common/guards/active-membership.guard';
import { CloudinaryService } from '../../media/cloudinary/cloudinary.service';
import { ENClubFeatureStatus } from '@generated/prisma-nestjs-graphql/prisma/en-club-feature-status.enum';
import { TimezoneService } from '@common/timezone/timezone.service';

@Injectable()
export class ClubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly timezoneService: TimezoneService,
  ) {}

  private logger = new Logger(ClubService.name);

  /**
   * Generates a short abbreviation/acronym from a full club name.
   *
   * Examples:
   * - "Manchester United" -> "MU"
   * - "Real Madrid Football Club" -> "RMFC"
   * - "Arsenal" -> "ARS"
   * - "FC Barcelona" -> "FCB"
   * - "A" -> "A"
   */
  private generateShortName(name: string, maxLen: number = 4): string {
    if (!name || !name.trim()) return '';

    // Clean extra spaces and extract words ignoring special chars
    const words = name
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (words.length === 0) return 'CLUB';

    // Multi-word name: Take the first letter of each word
    if (words.length > 1) {
      return words
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, maxLen);
    }

    // Single word: Take up to 3 chars (e.g., "Arsenal" -> "ARS")
    const singleWord = words[0];
    if (singleWord.length <= 3) {
      return singleWord.toUpperCase();
    }

    return singleWord.slice(0, 3).toUpperCase();
  }

  public async createClub(
    createClubDto: CreateClubDto,
    userId: string,
    timezone?: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { person: true },
      });

      if (!user) throw new ResourceNotFoundException('User not found', 'user');

      return await this.prisma.$transaction(async (tx) => {
        const now = this.timezoneService.nowUtc();

        const club = await tx.club.create({
          data: {
            name: createClubDto.name,
            shortName:
              createClubDto.shortName ??
              this.generateShortName(createClubDto.name),
            logo: createClubDto.logo,
            country: createClubDto.country,
            timezone: this.timezoneService.resolve(
              createClubDto.timezone ?? timezone,
              undefined,
            ),
            status: ENClubStatus.ACTIVE,
          },
        });

        const uniqueTypes = Array.from(
          new Set([ENMembershipType.OWNER, ...createClubDto.membershipTypes]),
        );

        // Create membership for creator
        const ownerMembership = await tx.membership.create({
          data: {
            clubId: club.id,
            joinedAt: now,
            personId: user.person.id,
            types: {
              create: uniqueTypes.map((type) => ({ type: type })),
            },
            status: ENMembershipStatus.ACTIVE,
          },
          include: { types: true },
        });

        // Assign ADMIN role to creator
        const adminRole = await tx.role.findUnique({
          where: { code: 'ADMIN' },
        });

        if (adminRole) {
          await tx.membershipRole.create({
            data: {
              membershipId: ownerMembership.id,
              roleId: adminRole.id,
            },
          });
          // NO membershipPermission records inserted here!
          // Role defaults resolve automatically at runtime via ActiveMembershipGuard.
        }

        const features = await tx.feature.findMany({
          where: { isActive: true, isCore: true },
        });
        if (features.length > 0) {
          await tx.clubFeature.createMany({
            data: features.map((feature) => ({
              clubId: club.id,
              featureId: feature.id,
              status: ENClubFeatureStatus.ENABLED,
              enabledById: feature.isCore ? ownerMembership.id : null,
              enabledAt: feature.isCore ? now : null,
            })),
          });
        }

        const finalizedClub = await tx.club.update({
          where: { id: club.id },
          data: { createdById: ownerMembership.id },
        });

        return finalizedClub;
      });
    } catch (error) {
      console.error('Club creation error:', error);
      throw error;
    }
  }

  public async updateClub(
    data: UpdateClubDto,
    membership: TActiveMembershipPayload,
    timezone?: string,
  ) {
    // 1. Find the active membership for this user/person and include the club
    if (!membership || !membership.club)
      throw new ResourceNotFoundException(
        'No club found for this user',
        'club',
      );

    const club = membership.club;
    const updatedClub = await this.prisma.club.update({
      where: { id: club.id },
      data: {
        ...data,
        ...(data.timezone === undefined && timezone ? { timezone } : {}),
      },
    });

    // if the club has a logo, and we updated the logo, delete the old one
    if (data.logo && membership.club.logo) {
      this.cloudinaryService.deleteFile(membership.club.logo).catch((err) => {
        this.logger.error(
          `Error deleting Cloudinary asset: oldLogo: ${membership.club.logo} \nNew Logo: ${data.logo} \nError: ${err}`,
        );
      });
    }

    return updatedClub;
  }

  public async myClubs(personId: string) {
    try {
      return await this.prisma.club.findMany({
        where: {
          memberships: {
            some: {
              personId,
              status: ENMembershipStatus.ACTIVE,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(parsePrismaError(error));
    }
  }

  /**
   * The permission is to club.delete
   * @param membershipId
   * @param clubId
   */
  public async archiveClub(clubId: string, membershipId: string) {}

  public async getClub(clubId: string) {}
}
