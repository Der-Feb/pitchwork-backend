import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { TActiveMembershipPayload } from '@common/guards/active-membership.guard';
import { parsePrismaError } from '@common/utils/error-handler';
import { Prisma } from '@prisma/client';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found';
import { CreateRoleDto, UpdateRoleDto } from './role.dto';
import { UpdateClubDto } from '@clubs/club/club.dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  public async getRolesInClub(clubId: string) {
    return await this.prisma.role.findMany({
      where: {
        OR: [{ isSystem: true }, { clubId, isSystem: false }],
      },
    });
  }

  public async getRole(role_id: string, clubId: string, membershipId: string) {}

  public async updatedClubRole(
    role_id: string,
    data: UpdateRoleDto,
    clubId: string,
    user_id: string,
  ) {
    const { name, description } = data;
    const role = await this.prisma.role.findUnique({ where: { id: role_id } });
    if (!role) throw new ResourceNotFoundException('Role not found', 'role');

    if (!role.isSystem)
      if (role.clubId !== clubId)
        throw new BadRequestException('Role does not belong to the club');

    const updatedRole = await this.prisma.role.update({
      where: { id: role_id },
      data: { name, description },
    });

    return updatedRole;
  }

  public async assignRole(
    adminMembership: TActiveMembershipPayload,
    targetMembershipId: string,
    roleCode: string,
    user_id: string,
  ) {}

  public async revokeRole(
    adminMembership: TActiveMembershipPayload,
    targetMembershipId: string,
    roleCode: string,
    user_id: string,
  ) {
    // user_id is for the admin
    const targetMembership = await this.prisma.membership.findUnique({
      where: { id: targetMembershipId },
    });
    if (!targetMembership)
      throw new ResourceNotFoundException(
        'Target membership not found',
        'membership',
      );

    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
    });
    if (!role) throw new ResourceNotFoundException('Role not found', 'role');

    if (!role.isSystem)
      if (role.clubId !== adminMembership.clubId)
        throw new BadRequestException('Role does not belong to the club');

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.membershipRole.deleteMany({
          where: {
            membershipId: targetMembershipId,
            roleId: role.id,
          },
        });
      });
      return true;
    } catch (error) {
      throw new InternalServerErrorException(parsePrismaError(error));
    }
  }

  public async createRole(
    data: CreateRoleDto,
    clubId: string,
    user_id: string,
  ) {
    const { roleCode, name, description } = data;
    const existingRole = await this.prisma.role.findUnique({
      where: { code: roleCode },
    });
    if (existingRole)
      throw new BadRequestException('Role with same code already exists');

    const role = await this.prisma.role.create({
      data: {
        code: roleCode,
        name,
        clubId,
        description,
        isSystem: false,
      },
    });

    return role;
  }

  public async deleteRole(roleId: string, clubId: string, user_id: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new ResourceNotFoundException('Role not found', 'role');

    if (role.isSystem)
      throw new BadRequestException('System roles cannot be deleted');

    if (role.clubId !== clubId)
      throw new BadRequestException('Role does not belong to the club');

    await this.prisma.role.delete({ where: { id: roleId } });

    return role;
  }
}
