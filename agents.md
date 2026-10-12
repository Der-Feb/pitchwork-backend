# AGENTS.md — Pitchwork Backend Development Guide

## Project Overview

Pitchwork is a multi-tenant football club management platform designed to manage:

- Clubs
- People
- Users
- Memberships
- Roles
- Permissions
- Profiles
- Athletes
- Coaches
- Teams
- Training
- Matches
- Notifications
- Operational workflows

The backend is responsible for the application's business logic, authorization, persistence, security, and API layer.

The backend is built with:

- **Framework:** NestJS 11
- **Language:** TypeScript (strict)
- **API:** REST API
- **ORM:** Prisma 7
- **Database:** PostgreSQL
- **Database Driver:** `@prisma/adapter-pg`
- **Authentication:** Passport + JWT
- **Authentication Transport:** HTTP-only cookies
- **Password Hashing:** Argon2
- **Token Hashing:** HMAC-SHA-256
- **Validation:** `class-validator` + `class-transformer`
- **Email:** NestJS Mailer + Nodemailer
- **Scheduling:** `@nestjs/schedule`
- **Documentation:** Swagger / OpenAPI
- **Testing:** Jest
- **Containerization:** Docker

The goal is to maintain a clean, scalable, secure, and maintainable backend capable of supporting multiple football clubs while keeping club data isolated.

---

# Core Development Principles

## 1. Understand the Existing Architecture First

Before implementing a feature:

1. Inspect the relevant module.
2. Inspect related Prisma models.
3. Inspect existing DTOs.
4. Inspect existing guards and decorators.
5. Inspect related services.
6. Inspect existing permission codes.
7. Inspect audit-log behavior.
8. Check whether a similar pattern already exists.

Do not introduce a new architectural pattern when an established project pattern already solves the problem.

Prefer extending existing modules over creating duplicate systems.

---

# 2. Modular Architecture

Follow NestJS module boundaries.

Each domain should have its own module.

Current structure:

```text
src/
├── iam/
│   ├── auth/
│   ├── membership/
│   ├── invitation/
│   ├── role/
│   ├── permission/
│   ├── profile/
│   └── user-token/
│
├── clubs/
│   └── club/
│
├── teams/
│   └── team/
│
├── athletes/
│   └── athlete/
│
├── infrastructure/
│   ├── prisma/
│   ├── communication/
│   └── audit-logs/
│
├── tasks/
└── graphql/
```

A domain module should normally contain:

```text
module
controller
service
dto
guards/decorators when required
```

Avoid large shared services containing unrelated business logic.

Business logic belongs to the domain responsible for it.

---

# Domain Architecture

The fundamental identity model is:

```text
User
  ↓
Person
  ↓
Membership
  ↓
Club
```

Operational relationships then extend from the membership/club context:

```text
Membership
   ├── Roles
   ├── Permissions
   ├── Athlete
   └── CoachAssignment
             ↓
           Team
```

Do not collapse these concepts into one model.

---

# Person

`Person` represents a real-world human.

A person may have:

- a User account
- a Profile
- an AthleteProfile
- a CoachProfile
- Memberships in clubs

A person is not automatically a user.

A person is not automatically an athlete.

A person is not automatically a coach.

Do not duplicate personal identity information unnecessarily across these models.

---

# User

`User` represents system authentication.

A user:

- authenticates
- owns credentials
- has a relationship with a Person
- can access the system through memberships

Passwords must never be stored in plain text.

User authentication data should remain separate from club-specific membership information.

---

# Membership

Membership represents the relationship between a `Person` and a `Club`.

```text
Person
   │
   └── Membership ─── Club
```

Membership contains club-specific context such as:

- membership type
- status
- roles
- direct permissions
- membership lifecycle

A person may have memberships in multiple clubs.

Ending or suspending a membership must not delete the person or user.

Historical membership information should be preserved.

---

# Multi-Tenancy and Club Context

Pitchwork is a multi-tenant system.

Most authenticated club-scoped operations operate within an active club context.

The current active club is selected using:

```text
x-club-id
```

The backend must never trust the header by itself.

`ActiveMembershipGuard` must verify that the authenticated person actually has an appropriate membership in the requested club.

Never allow data from one club to be accessed through another club's context.

Every new club-scoped feature must consider:

- How the club is identified.
- Whether membership is required.
- Which permissions are required.
- Whether the queried resource belongs to the active club.

---

# API Design Rules

## REST API

REST is the primary application API.

Use REST for:

- Authentication
- Club management
- Membership management
- Invitations
- Roles
- Permissions
- Profiles
- Athletes
- Teams
- Training
- Matches
- Notifications
- Reports
- Other application workflows

Controllers must remain thin.

Use the following flow:

```text
HTTP Request
     ↓
Guards
     ↓
Controller
     ↓
Service
     ↓
Prisma
     ↓
PostgreSQL
```

Controllers should:

- receive validated DTOs
- invoke services
- return appropriate responses

Controllers should not contain business logic or complex database queries.

---

# DTOs and Validation

Use DTOs for request validation.

The application uses global validation with:

```text
whitelist: true
forbidNonWhitelisted: true
transform: true
```

Do not bypass validation unnecessarily.

Use:

- `class-validator`
- `class-transformer`
- project-specific validators such as `IsCuid2`
- `ParseCuidPipe` for route IDs where appropriate

Reject malformed input at the API boundary.

---

# Authentication

Pitchwork currently uses Passport-based authentication.

Authentication flow:

```text
Client
  ↓
HTTP-only accessToken cookie
  ↓
PassportJwtGuard
  ↓
JwtStrategy
  ↓
req.user
```

JWT payload currently contains:

```text
{
  sub: user_id,
  person_id
}
```

The JWT cookie is:

- HTTP-only
- SameSite strict
- Secure in production
- 24-hour lifetime

Do not expose authentication tokens to frontend JavaScript.

---

# Authentication Responsibilities

Authentication functionality includes:

- registration
- login
- logout
- current-user lookup
- email verification
- password reset

Passwords use Argon2.

Application tokens such as verification and password-reset tokens use:

```text
CSPRNG random token
        ↓
HMAC-SHA-256
        ↓
hashed token stored in database
```

Never store raw application tokens.

---

# Authentication Guard Chain

For club-scoped protected endpoints, guard order matters.

The normal chain is:

```text
PassportJwtGuard
        ↓
EmailVerifiedGuard
        ↓
ActiveMembershipGuard
        ↓
PermissionsGuard
```

### PassportJwtGuard

Authenticates the user.

Provides:

```text
req.user
```

---

### EmailVerifiedGuard

Ensures the user's email has been verified.

---

### ActiveMembershipGuard

Requires:

```text
x-club-id
```

It:

1. Identifies the requested club.
2. Finds the person's membership.
3. Verifies membership status.
4. Loads membership context.
5. Loads roles and permissions.
6. Calculates effective permissions.
7. Attaches membership context to the request.

Provides:

```text
req.activeMembership
req.effectivePermissions
```

---

### PermissionsGuard

Reads permission metadata from decorators and checks the effective permissions.

Do not manually reproduce permission checks inside controllers.

---

# Authorization — PBAC

Pitchwork uses **Permission-Based Access Control**, not simple role-only authorization.

The effective permission system is:

```text
Role Permissions
      +
Explicit GRANTS
      -
Explicit REVOKES
      =
Effective Permissions
```

Resolution order:

1. Collect permissions from all assigned roles.
2. Add explicit `GRANT` permissions.
3. Remove explicit `REVOKE` permissions.
4. Use the resulting set as the membership's effective permissions.

An explicit revoke therefore overrides a role-derived permission.

---

# Permission Decorators

Use the project's permission decorators.

Example:

```typescript
@RequirePermissions(true, [
  'CLUB_WRITE',
  'MEMBERSHIP_WRITE',
])
```

`strict=true` means all required permissions are required.

`strict=false` means at least one required permission is sufficient.

Do not hardcode authorization rules inside services or controllers when the permission system should handle them.

---

# Roles

Roles are club-scoped.

System roles currently include:

```text
ADMIN
COACH
ATHLETE
```

System roles must not be treated the same as custom club roles.

Do not allow normal role-management operations to modify or delete protected system roles.

Role assignment and revocation must respect the membership and club context.

---

# Direct Permissions

Memberships may receive direct permission overrides.

Two actions exist:

```text
GRANT
REVOKE
```

Direct permissions modify the effective permission set after role permissions have been calculated.

When changing permission logic, always consider:

- role permissions
- grants
- revokes
- duplicate records
- synchronization behavior

---

# Database Rules

## Prisma

Prisma is the application's database access layer.

Do not write raw SQL unless there is a strong technical reason that Prisma cannot reasonably support the operation.

Database access belongs in services or dedicated persistence abstractions where appropriate.

Never put Prisma queries directly inside controllers.

---

# Prisma Schema Organization

The schema is modularized.

Current schema areas include:

```text
prisma/schema/
├── access.prisma
├── profile.prisma
├── pbac.prisma
├── feature.prisma
└── system.prisma
```

Before changing a model, inspect related models and relationships.

Do not treat an individual schema file as an isolated database.

---

# Database Migrations

Schema changes must be performed through Prisma migrations.

Typical development command:

```bash
npx prisma migrate dev --name migration_name
```

Never manually modify generated migration files unless there is a specific, well-understood reason.

Before changing database structure, consider:

- existing production data
- foreign keys
- uniqueness constraints
- nullable vs required fields
- historical data
- migration safety
- backwards compatibility

---

# Transactions

Use Prisma transactions when multiple database operations must succeed or fail together.

Examples:

```text
Create club
  ↓
Create owner membership
  ↓
Assign ADMIN role
  ↓
Set createdBy
```

These operations should remain atomic.

Likewise for workflows such as:

```text
Accept invitation
  ↓
Create membership
  ↓
Delete invitation
```

Do not leave partially completed business operations when atomicity is required.

---

# Historical Data

Pitchwork is intended to preserve organizational history.

Do not casually delete:

- people
- historical memberships
- contracts
- important audit records
- operational history

Prefer:

- status changes
- archival
- soft deletion
- lifecycle states

when historical information has business value.

---

# Audit Logging

Important business operations should create audit logs.

The project provides:

```text
AuditLogsService
```

Audit logs support:

- category
- action
- entity type
- description
- metadata
- creator

Audit logging can participate in Prisma transactions.

When implementing an important state-changing workflow, determine whether it should produce an audit record.

Never put passwords, raw authentication tokens, or other secrets into audit metadata.

---

# Error Handling

The application uses a global exception filter.

Errors should be represented using appropriate NestJS exceptions and existing project error conventions.

Do not expose:

- passwords
- password hashes
- raw tokens
- secrets
- database credentials
- unnecessary internal stack traces

Use the existing Prisma error handling utilities where applicable.

Common Prisma errors include:

```text
P2002 → unique constraint
P2003 → foreign-key constraint
P2025 → resource not found
P2014 → relationship violation
P1000/P1001 → database connection problems
```

---

# Email and Communication

Email functionality is centralized through:

```text
CommunicationService
```

Use the communication service instead of creating independent mailer implementations inside feature modules.

Email workflows include:

- verification emails
- password reset emails
- club invitations

Email failures should be handled using the existing exception conventions.

---

# Scheduled Tasks

Scheduled cleanup belongs in the task infrastructure.

Current scheduled operations include:

- expired user-token cleanup
- expired invitation cleanup
- deletion of stale unverified accounts

When adding scheduled tasks:

- make the operation idempotent
- avoid deleting valid records
- consider transaction boundaries
- log important failures
- ensure the task can safely run repeatedly

---

# Feature Architecture

Pitchwork is designed around modular club features.

Current feature concepts include:

```text
IAM
CLUB
TEAM
ATHLETE
TRAINING
MATCH
SIGNING
MEDICAL
FINANCE
```

Not every club must necessarily use every feature.

When implementing a new major domain, consider:

```text
Club
   ↓
Enabled Features
   ↓
Feature Module
   ↓
Feature Permissions
```

Do not tightly couple unrelated feature modules.

---

# Current Domain Direction

The core domain currently follows:

```text
User
   ↓
Person
   ↓
Membership
   ↓
Club
   ↓
Team
```

Athletes and coaches are specialized operational relationships:

```text
Person
   ├── AthleteProfile
   │      ↓
   │    Athlete
   │      ↓
   │    Team
   │
   └── CoachProfile
          ↓
     CoachAssignment
          ↓
        Team
```

Keep identity, membership, profile, and operational roles conceptually separate.

---

# Athlete Architecture

A person should not automatically become an athlete.

Athlete functionality should handle:

- athlete creation
- athlete profile
- athlete information
- team assignment
- team removal
- athlete lifecycle
- athlete permissions

Athlete operations must remain club-scoped.

---

# Coach Architecture

Coach information is represented through:

```text
CoachProfile
CoachAssignment
Team
```

A coach can be assigned to teams through `CoachAssignment`.

Coach assignment must respect:

- active club context
- valid person/coach profile
- valid team
- authorization

---

# Team Architecture

Teams are club-scoped resources.

Team operations must verify that the team belongs to the active club.

Future team relationships include:

```text
Team
├── Athletes
├── Coaches
├── Training
└── Matches
```

Never allow an athlete, coach, or training record from another club to be attached to the current club's team.

---

# Testing Rules

Important business rules must have tests.

Testing priority:

1. Authentication
2. Authorization
3. Membership lifecycle
4. Multi-club isolation
5. Permission resolution
6. Athlete/team relationships
7. Critical business workflows
8. Scheduled cleanup
9. Security-sensitive functionality

Especially test the PBAC resolution algorithm.

Example:

```text
ADMIN
  → CLUB_WRITE ✓

COACH
  → CLUB_WRITE ✗

COACH + GRANT CLUB_WRITE
  → CLUB_WRITE ✓

ADMIN + REVOKE CLUB_WRITE
  → CLUB_WRITE ✗
```

Also test cross-club isolation.

---

# Environment Configuration

Never commit secrets.

Environment variables should contain sensitive configuration such as:

```text
DATABASE_URL=
JWT_SECRET=
TOKEN_HASH_SECRET=
NODE_ENV=
```

Email credentials must also remain in environment configuration.

Never expose secrets through:

- API responses
- logs
- audit metadata
- Swagger examples
- error messages
- committed source code

---

# API Documentation

Swagger/OpenAPI is available through:

```text
/api/docs
```

When adding or significantly changing public endpoints:

- document DTOs
- document authentication requirements
- document required headers
- document response behavior
- document important error responses

---

# Git Rules

Commit messages should be descriptive.

Use:

```text
type(scope): description
```

Examples:

```text
feat(athlete): add athlete management endpoints

feat(membership): implement membership lifecycle

fix(auth): prevent expired token reuse

fix(permission): correct revoke precedence

refactor(team): separate assignment logic

docs(backend): update architecture guide

test(permission): add PBAC resolution tests
```

Avoid vague messages such as:

```text
fix stuff
changes
backend update
```

---

# Agent Rules

When modifying the project:

1. Understand the existing architecture before creating files.
2. Search for existing implementations before introducing new patterns.
3. Prefer extending existing modules over creating duplicates.
4. Keep controllers thin.
5. Put business logic inside services.
6. Use DTOs and validation at API boundaries.
7. Respect the active club context.
8. Never bypass authorization for convenience.
9. Never trust `x-club-id` without membership validation.
10. Do not expose data belonging to another club.
11. Use Prisma for database access.
12. Use transactions for atomic business workflows.
13. Preserve historical business data.
14. Add audit logging where appropriate.
15. Do not introduce dependencies without justification.
16. Do not change database models without considering migration impact.
17. Do not break existing API contracts without a deliberate migration strategy.
18. Add tests for important business rules.
19. Update documentation when architecture changes.
20. Keep security-sensitive logic centralized.

---

# Things Agents Must Not Do

Do not:

- Put Prisma queries in controllers.
- Hardcode authorization checks throughout the application.
- Trust client-provided club IDs without validation.
- Store plain-text passwords.
- Store raw verification/reset tokens.
- Return password hashes.
- Log authentication secrets.
- Delete historical organizational data without a clear reason.
- Create duplicate authentication systems.
- Create duplicate permission systems.
- Create feature-specific mailer implementations.
- Bypass DTO validation.
- Disable guards just to make an endpoint work.
- Add dependencies without understanding why they are necessary.
- Modify migration history casually.
- Introduce a new architecture without checking existing conventions.

---

# Current Backend Status

The following areas are already substantially implemented:

- Authentication
- User registration/login/logout
- Email verification
- Password reset
- JWT authentication
- Email verification guard
- Active membership guard
- PBAC permission resolution
- Roles
- Direct permissions
- Membership creation/suspension
- Club registration/update
- Invitations
- Profiles
- Teams
- Audit-log creation
- Communication/email infrastructure
- Scheduled cleanup
- Prisma infrastructure
- Swagger/OpenAPI

The following areas are incomplete or planned:

- Athlete module
- Athlete ↔ Team assignment
- Coach assignment workflows
- Training module
- Notification system
- Audit-log read/list API
- Club archive endpoint
- Multi-membership/active-club improvements
- Refresh-token system
- GraphQL beyond the basic health check
- Comprehensive automated tests
- Feature/module activation system
- Future Match, Medical, Finance, and Signing modules

When implementing new work, do not assume these modules are already complete.

Inspect the actual implementation first.

---

# Production Requirements

Before production deployment:

- Database migrations must succeed.
- Environment variables must be configured securely.
- No secrets may exist in source code.
- Authentication flows must be tested.
- Authorization flows must be tested.
- Cross-club isolation must be tested.
- Logging must not expose sensitive information.
- API health checks must pass.
- Scheduled tasks must be safe and idempotent.
- Database indexes and constraints must be reviewed.
- Swagger documentation must reflect the public API.
- Critical business workflows must have automated tests.

---

# Final Rule

When working on Pitchwork backend:

> **Preserve the domain model, respect the club boundary, keep business logic inside the appropriate module, and extend existing architecture before inventing new architecture.**

When uncertain, inspect the existing implementation and follow its established pattern before making a new one.