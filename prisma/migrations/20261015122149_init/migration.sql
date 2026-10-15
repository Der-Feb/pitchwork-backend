-- CreateEnum
CREATE TYPE "ENGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ENIdentifierType" AS ENUM ('EMAIL', 'PHONE', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "ENUserTokenType" AS ENUM ('EMAIL_VERIFICATION', 'CHANGE_PASSWORD', 'LOGIN_OTP');

-- CreateEnum
CREATE TYPE "ENUserTokenStatus" AS ENUM ('PENDING', 'DISRUPTED');

-- CreateEnum
CREATE TYPE "ENInvitationStatus" AS ENUM ('PENDING', 'DISRUPTED');

-- CreateEnum
CREATE TYPE "ENPreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "ENFeature" AS ENUM ('ACCESS', 'CLUB', 'TEAM', 'ATHLETE', 'CHAT', 'TRAINING', 'MATCH', 'SIGNING', 'MEDICAL', 'FINANCE');

-- CreateEnum
CREATE TYPE "ENClubFeatureStatus" AS ENUM ('ENABLED', 'DISABLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ENClubStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ENTeamCategory" AS ENUM ('ACADEMY', 'PRIMARY', 'SENIOR');

-- CreateEnum
CREATE TYPE "ENMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "ENMembershipType" AS ENUM ('OWNER', 'STAFF', 'ATHLETE', 'GUARDIAN', 'AGENT', 'BOARD');

-- CreateEnum
CREATE TYPE "ENRelationType" AS ENUM ('GUARDIAN', 'AGENT');

-- CreateEnum
CREATE TYPE "ENCoachPosition" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'GOALKEEPER_COACH', 'FITNESS_COACH');

-- CreateEnum
CREATE TYPE "ENCoachResponsibility" AS ENUM ('TACTICAL', 'TECHNICAL', 'MATCHDAY_MANAGEMENT', 'PIECES');

-- CreateEnum
CREATE TYPE "ENPermissionAction" AS ENUM ('CREATE', 'READ', 'WRITE', 'DELETE', 'APPROVE', 'EXPORT', 'ASSIGN');

-- CreateEnum
CREATE TYPE "ENScopeType" AS ENUM ('CLUB', 'TEAM', 'OWN', 'RELATED', 'ANY');

-- CreateEnum
CREATE TYPE "ENMembershipPermissionAction" AS ENUM ('GRANT', 'REVOKE');

-- CreateEnum
CREATE TYPE "ENAuditLogResult" AS ENUM ('SUCCESS', 'DENIED');

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "gender" "ENGender" NOT NULL,
    "dob" DATE NOT NULL,
    "nationality" TEXT NOT NULL,
    "profile_picture" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "password_hash" TEXT,
    "two_factor_secret" TEXT,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "last_login" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "locked_until" TIMESTAMPTZ(3),
    "person_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identifiers" (
    "id" TEXT NOT NULL,
    "type" "ENIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tokens" (
    "id" TEXT NOT NULL,
    "type" "ENUserTokenType" NOT NULL,
    "hash" TEXT NOT NULL,
    "status" "ENUserTokenStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "token_hash" TEXT NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "type" "ENMembershipType" NOT NULL,
    "status" "ENInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "team_id" TEXT,
    "inviter_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "session_id" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_records" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "preferred_foot" "ENPreferredFoot",
    "natural_position" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "athlete_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "code" "ENFeature" NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_core" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_features" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "status" "ENClubFeatureStatus" NOT NULL DEFAULT 'DISABLED',
    "enabled_by" TEXT,
    "enabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "club_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "logo" TEXT,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_by" TEXT,
    "status" "ENClubStatus" NOT NULL DEFAULT 'ACTIVE',
    "staffRecordId" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ENTeamCategory" NOT NULL DEFAULT 'SENIOR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "club_id" TEXT NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "status" "ENMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "end_reason" TEXT,
    "joined_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "person_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_types" (
    "membership_id" TEXT NOT NULL,
    "type" "ENMembershipType" NOT NULL
);

-- CreateTable
CREATE TABLE "person_relations" (
    "id" TEXT NOT NULL,
    "relation_type" "ENRelationType" NOT NULL,
    "created_via" TEXT,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "club_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "related_person_id" TEXT NOT NULL,

    CONSTRAINT "person_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_records" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "license" TEXT,
    "specialization" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "membership_id" TEXT NOT NULL,

    CONSTRAINT "staff_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_assignments" (
    "id" TEXT NOT NULL,
    "position" "ENCoachPosition" NOT NULL,
    "responsibilities" "ENCoachResponsibility"[] DEFAULT ARRAY[]::"ENCoachResponsibility"[],
    "starts_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "team_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,

    CONSTRAINT "coach_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "module" "ENFeature" NOT NULL,
    "action" "ENPermissionAction" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(10) NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "club_id" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "id" TEXT NOT NULL,
    "scope" "ENScopeType" NOT NULL DEFAULT 'OWN',
    "scope_id" TEXT,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membership_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_by" TEXT,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_permissions" (
    "id" TEXT NOT NULL,
    "action" "ENMembershipPermissionAction" NOT NULL,
    "membership_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "membership_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "category" "ENFeature" NOT NULL,
    "action" TEXT NOT NULL,
    "result" "ENAuditLogResult" NOT NULL,
    "description" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_by" TEXT DEFAULT 'system',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_person_id_key" ON "users"("person_id");

-- CreateIndex
CREATE INDEX "user_identifiers_user_id_idx" ON "user_identifiers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identifiers_type_value_key" ON "user_identifiers"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_hash_key" ON "user_tokens"("hash");

-- CreateIndex
CREATE INDEX "user_tokens_user_id_type_status_idx" ON "user_tokens"("user_id", "type", "status");

-- CreateIndex
CREATE INDEX "invitations_email_phone_idx" ON "invitations"("email", "phone");

-- CreateIndex
CREATE INDEX "invitations_email_token_hash_status_idx" ON "invitations"("email", "token_hash", "status");

-- CreateIndex
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_hash_key" ON "refresh_tokens"("hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_codes_user_id_code_hash_key" ON "recovery_codes"("user_id", "code_hash");

-- CreateIndex
CREATE INDEX "athlete_records_club_id_idx" ON "athlete_records"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_records_membership_id_club_id_key" ON "athlete_records"("membership_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");

-- CreateIndex
CREATE INDEX "club_features_club_id_idx" ON "club_features"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_features_club_id_feature_id_key" ON "club_features"("club_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_created_by_key" ON "clubs"("created_by");

-- CreateIndex
CREATE INDEX "clubs_created_by_idx" ON "clubs"("created_by");

-- CreateIndex
CREATE INDEX "teams_club_id_idx" ON "teams"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_id_club_id_key" ON "teams"("id", "club_id");

-- CreateIndex
CREATE INDEX "memberships_person_id_idx" ON "memberships"("person_id");

-- CreateIndex
CREATE INDEX "memberships_club_id_idx" ON "memberships"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_person_id_club_id_key" ON "memberships"("person_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_id_club_id_key" ON "memberships"("id", "club_id");

-- CreateIndex
CREATE INDEX "membership_types_membership_id_idx" ON "membership_types"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_types_membership_id_type_key" ON "membership_types"("membership_id", "type");

-- CreateIndex
CREATE INDEX "person_relations_club_id_idx" ON "person_relations"("club_id");

-- CreateIndex
CREATE INDEX "person_relations_person_id_idx" ON "person_relations"("person_id");

-- CreateIndex
CREATE INDEX "person_relations_related_person_id_idx" ON "person_relations"("related_person_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_relations_club_id_person_id_related_person_id_relati_key" ON "person_relations"("club_id", "person_id", "related_person_id", "relation_type");

-- CreateIndex
CREATE INDEX "staff_records_club_id_idx" ON "staff_records"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_records_membership_id_club_id_key" ON "staff_records"("membership_id", "club_id");

-- CreateIndex
CREATE INDEX "coach_assignments_membership_id_idx" ON "coach_assignments"("membership_id");

-- CreateIndex
CREATE INDEX "coach_assignments_team_id_idx" ON "coach_assignments"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "roles_club_id_idx" ON "roles"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_club_id_code_key" ON "roles"("club_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "membership_roles_membership_id_idx" ON "membership_roles"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_roles_membership_id_role_id_scope_scope_id_key" ON "membership_roles"("membership_id", "role_id", "scope", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_permissions_membership_id_permission_id_key" ON "membership_permissions"("membership_id", "permission_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_created_by_idx" ON "audit_logs"("entity_type", "created_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identifiers" ADD CONSTRAINT "user_identifiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_records" ADD CONSTRAINT "athlete_records_membership_id_club_id_fkey" FOREIGN KEY ("membership_id", "club_id") REFERENCES "memberships"("id", "club_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_features" ADD CONSTRAINT "club_features_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_features" ADD CONSTRAINT "club_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_features" ADD CONSTRAINT "club_features_enabled_by_fkey" FOREIGN KEY ("enabled_by") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_staffRecordId_fkey" FOREIGN KEY ("staffRecordId") REFERENCES "staff_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_types" ADD CONSTRAINT "membership_types_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_relations" ADD CONSTRAINT "person_relations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_relations" ADD CONSTRAINT "person_relations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_relations" ADD CONSTRAINT "person_relations_related_person_id_fkey" FOREIGN KEY ("related_person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_records" ADD CONSTRAINT "staff_records_membership_id_club_id_fkey" FOREIGN KEY ("membership_id", "club_id") REFERENCES "memberships"("id", "club_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_membership_id_club_id_fkey" FOREIGN KEY ("membership_id", "club_id") REFERENCES "memberships"("id", "club_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
