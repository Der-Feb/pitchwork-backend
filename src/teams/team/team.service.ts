import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { TActiveMembershipPayload } from '@common/guards/active-membership.guard';
import { Club } from '@prisma/client';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  public async createTeam(
    adminMembership: TActiveMembershipPayload,
    teamName: string,
    user_id: string,
  ) {
    const club: Club = adminMembership.club;
    const teamExists = await this.prisma.team.findFirst({
      where: { name: teamName, clubId: club.id },
    });
    if (teamExists)
      throw new BadRequestException(`Team ${teamName} already exists`);

    const team = await this.prisma.team.create({
      data: {
        name: teamName,
        clubId: club.id,
      },
    });

    return team;
  }

  public async getTeamList(adminMembership: TActiveMembershipPayload) {
    const club: Club = adminMembership.club;
    return await this.prisma.team.findMany({
      where: { clubId: club.id },
    });
  }

  public async getTeamById(
    adminMembership: TActiveMembershipPayload,
    teamId: string,
  ) {
    const club: Club = adminMembership.club;
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, clubId: club.id },
    });

    if (!team)
      throw new ResourceNotFoundException(`Team ${teamId} not found`, 'Team');
    return team;
  }

  public async updateTeam(
    adminMembership: TActiveMembershipPayload,
    teamId: string,
    teamName: string,
    user_id: string,
  ) {
    const club: Club = adminMembership.club;
    const existingTeam = await this.prisma.team.findFirst({
      where: { id: teamId, clubId: club.id },
    });
    if (!existingTeam)
      throw new ResourceNotFoundException(`Team ${teamId} not found`, 'Team');

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: { name: teamName },
    });

    return team;
  }
}
