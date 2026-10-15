import 'dotenv/config';
import { ENPermissionAction, ENFeature, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Initialize PostgreSQL pool and Prisma adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissionsData = [
  // ACCESS MODULE
  { code: 'PERMISSION_ASSIGN', name: 'Assign Permission', module: ENFeature.ACCESS, action: ENPermissionAction.ASSIGN, description: 'Assign permissions to members' },
  { code: 'PERMISSION_READ', name: 'Read Member Information', module: ENFeature.ACCESS, action: ENPermissionAction.READ, description: 'View permissions details' },
  { code: 'PERMISSION_REVOKE', name: 'Revoke Permission', module: ENFeature.ACCESS, action: ENPermissionAction.DELETE, description: 'Revoke permissions to members' },
  { code: 'ROLE_ASSIGN', name: 'Assign Role', module: ENFeature.ACCESS, action: ENPermissionAction.ASSIGN, description: 'Assign roles to members' },
  { code: 'ROLE_READ', name: 'Read Role Information', module: ENFeature.ACCESS, action: ENPermissionAction.READ, description: 'View roles details' },
  { code: 'ROLE_REVOKE', name: 'Revoke Roles', module: ENFeature.ACCESS, action: ENPermissionAction.DELETE, description: 'Revoke roles to members' },
  { code: 'ROLE_DELETE', name: 'Delete Role', module: ENFeature.ACCESS, action: ENPermissionAction.DELETE, description: 'Delete or archive non system role' },
  { code: 'MEMBERSHIP_READ', name: 'Read Membership Information', module: ENFeature.ACCESS, action: ENPermissionAction.READ, description: 'View membership details' },
  { code: 'MEMBERSHIP_WRITE', name: 'Write Membership Information', module: ENFeature.ACCESS, action: ENPermissionAction.WRITE, description: 'Write membership details' },
  { code: 'MEMBERSHIP_SUSPEND', name: 'Suspend Membership', module: ENFeature.ACCESS, action: ENPermissionAction.DELETE, description: 'Suspend membership' },

  // 
];

const roleData = [
  {
    code: "ADMIN", name: "Admin",
    description: "Admin role with full access to all features of the club",
    permissionCodes: [] // will get all permissions dynamically
  },
];

const featuresData = [
  {
    code: ENFeature.ACCESS, name: 'Identity & Access Management',
    description: 'Authentication, memberships, roles and permissions for the club',
    isCore: true, isActive: true,
  },
];

async function main() {
  console.log("Starting data seeding ...");
  
  console.log("Seeding permissions ...");
  const createdPermissions = new Map<string, string>();
  for (const perm of permissionsData) {
    const permission = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
    });

    createdPermissions.set(permission.code, permission.id);
  }

  console.log("Seeding roles ...");
  for (const roleDef of roleData) {
    const existingRole = await prisma.role.findFirst({
      where: {
        code: roleDef.code,
        clubId: null,
      },
    });

    let role;
    if(existingRole) {
      role = await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name: roleDef.name,
          description: roleDef.description,
        }
      });
    } else {
      role = await prisma.role.create({
        data: {
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          clubId: null,
        },
      })
    }

    // Determine target permission codes (dynamically pull all permissions for ADMIN)
    const targetPermCodes =
      roleDef.code === "ADMIN"
        ? Array.from(createdPermissions.keys())
        : roleDef.permissionCodes;

    // Connect Permissions to Role via RolePermission junction table
    for (const permCode of targetPermCodes) {
      const permissionId = createdPermissions.get(permCode);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permissionId,
        },
      });
    }
  }

  console.log("Seeding features ...");
  for (const feat of featuresData) {
    await prisma.feature.upsert({
      where: { code: feat.code },
      update: { name: feat.name, description: feat.description, isCore: feat.isCore },
      create: { code: feat.code, name: feat.name, description: feat.description, isCore: feat.isCore },
    });
  }

  console.log("✅ Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });