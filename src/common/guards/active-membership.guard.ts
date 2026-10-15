import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  ENMembershipPermissionAction,
  ENMembershipStatus,
  Prisma,
} from '@prisma/client';
import { getRequestFromContext } from '@common/utils/request-context.util';
import { TimezoneService } from '@common/timezone/timezone.service';

export type TActiveMembershipPayload = Prisma.MembershipGetPayload<{
  include: {
    permissions: { include: { permission: true } };
    club: true;
    person: { include: { user: true } };
    roles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
  };
}>;

declare global {
  namespace Express {
    interface Request {
      activeMembership?: TActiveMembershipPayload;
      effectivePermissions?: string[];
      timezone?: string | null;
    }
  }
}

@Injectable()
export class ActiveMembershipGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezoneService: TimezoneService,
  ) {}

  async canActivate(context: ExecutionContext) {
    return true;
  }

  private getRequest(context: ExecutionContext) {
    return getRequestFromContext(context);
  }
}
