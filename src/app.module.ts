import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TimezoneModule } from './common/timezone/timezone.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './iam/auth/auth.module';
import { AuditLogsModule } from './infrastructure/audit-logs/audit-logs.module';
import { ClubModule } from './clubs/club/club.module';
import { UserTokenModule } from './iam/user-token/user-token.module';
import { CommunicationModule } from './infrastructure/communication/communication.module';
import { MembershipModule } from './iam/membership/membership.module';
import { InvitationModule } from './iam/invitation/invitation.module';
import { TasksService } from './tasks/tasks.service';
import { PermissionModule } from './iam/permission/permission.module';
import { RoleModule } from './iam/role/role.module';
import { TeamModule } from './teams/team/team.module';
import { AthleteModule } from './athletes/athlete/athlete.module';
import { GraphqlModule } from './graphql/graphql.module';
import { AppResolver } from './app.resolver';
import { MediaModule } from './media/media.module';
import { FeatureModule } from './clubs/feature/feature.module';
import { CryptoModule } from './common/crypto/crypto.module';

@Module({
  imports: [
    TimezoneModule,
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    GraphqlModule,
    // IAM modules
    AuthModule,
    UserTokenModule,
    MembershipModule,
    InvitationModule,
    PermissionModule,
    RoleModule,
    // Business domain modules
    ClubModule,
    AthleteModule,
    TeamModule,
    // Infrastructure modules
    AuditLogsModule,
    CommunicationModule,
    MediaModule,
    FeatureModule,
    CryptoModule,
  ],
  providers: [TasksService, AppResolver],
})
export class AppModule {}
