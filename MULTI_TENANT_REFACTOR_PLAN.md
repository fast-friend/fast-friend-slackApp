# Multi-Tenant SaaS Architecture - Implementation Plan

## 📋 Overview

This document outlines the complete refactoring plan to transform Fast Friends from a single-user application to a multi-tenant SaaS platform where:

- Multiple organizations can use the platform
- Each organization can connect multiple Slack workspaces
- Users can belong to multiple organizations with different roles
- Workspaces are isolated - no cross-workspace data sharing

---

## 🎯 Target Architecture

```
Organization
  ├─ name, slug, subscription info
  │
  ├─ OrganizationMembers (Many-to-Many Junction)
  │    ├─ userId → AuthUser
  │    ├─ organizationId → Organization
  │    └─ role: OWNER | ADMIN | MEMBER
  │
  └─ Workspaces (SlackWorkspace)
       ├─ organizationId → Organization
       ├─ teamId, teamName, botToken
       │
       ├─ SlackUsers (Slack teammates)
       │    └─ userId (Slack ID), stats, groups
       │
       └─ Groups
            ├─ members: [slackUserId...]
            └─ Games → Sessions → Messages → Responses
```

---

## 📊 Phase 1: Database Models

### 1.1 NEW: Organization Model

**File:** `server/src/modules/organization/models/organization.model.ts`

```typescript
{
  name: string              // Organization name (e.g., "Acme Corp")
  slug: string              // URL-friendly unique identifier (e.g., "acme-corp")
  description?: string      // Optional description

  // Future fields (optional for now)
  logoUrl?: string
  website?: string

  // Subscription (optional - for future billing)
  subscriptionStatus: "trial" | "active" | "cancelled" | "expired"
  subscriptionPlan?: string
  subscriptionEndsAt?: Date

  // Metadata
  isActive: boolean         // Soft delete flag
  createdAt: Date
  updatedAt: Date
}

Indexes:
- slug: unique
- isActive: 1
```

---

### 1.2 NEW: OrganizationMember Model (Junction Table)

**File:** `server/src/modules/organization/models/organizationMember.model.ts`

```typescript
{
  userId: ObjectId          // Reference to AuthUser
  organizationId: ObjectId  // Reference to Organization

  role: "OWNER" | "ADMIN" | "MEMBER"

  // Optional fields
  invitedBy?: ObjectId      // Who invited this user
  joinedAt: Date            // When they joined

  isActive: boolean         // Can be removed from org
  createdAt: Date
  updatedAt: Date
}

Indexes:
- { userId: 1, organizationId: 1 }: unique (one role per user per org)
- { organizationId: 1, isActive: 1 }
- { userId: 1, isActive: 1 }

Roles Explained:
- OWNER: Created the organization, full access, can delete org
- ADMIN: Can manage workspaces, groups, games, invite users
- MEMBER: Read-only access or limited permissions (configurable)
```

---

### 1.3 REFACTOR: AuthUser Model

**File:** `server/src/modules/auth/models/authUser.model.ts`

**Changes:**

```typescript
// REMOVE:
role: "ORGANISATION" | "ADMIN" | "SUPERADMIN"  ❌

// KEEP:
{
  email: string
  password: string
  refreshTokens: [...]
  isActive: boolean
  emailVerified: boolean
  onboardingCompleted: boolean

  // ADD (optional):
  firstName?: string
  lastName?: string
  avatarUrl?: string

  createdAt: Date
  updatedAt: Date
}
```

**Note:** Role is now determined by `OrganizationMember` relationship, not a global user property.

---

### 1.4 REFACTOR: SlackWorkspace Model

**File:** `server/src/modules/slack/models/slackWorkspace.model.ts`

**Changes:**

```typescript
// CHANGE:
appUserId: ObjectId  ❌  // OLD: Reference to single user

// TO:
organizationId: ObjectId ✅  // NEW: Reference to Organization

// FULL MODEL:
{
  organizationId: ObjectId      // Reference to Organization
  teamId: string                // Slack team ID
  teamName: string              // Slack workspace name
  botUserId: string             // Bot user ID
  botToken: string              // Bot access token (TODO: encrypt)

  // ADD:
  connectedBy: ObjectId         // AuthUser who connected this workspace

  connectedAt: Date
  createdAt: Date
  updatedAt: Date
}

Indexes:
- { organizationId: 1, teamId: 1 }: unique (one org can't connect same workspace twice)
- { organizationId: 1 }
```

---

### 1.5 KEEP UNCHANGED: SlackUser, Group, Game, GameSession, GameMessage, GameResponse

These models remain the same. They reference `workspaceId`, which now belongs to an organization.

---

## 📦 Phase 2: Module Structure

### 2.1 NEW: Organization Module

```
server/src/modules/organization/
  ├─ index.ts
  ├─ models/
  │   ├─ organization.model.ts
  │   └─ organizationMember.model.ts
  ├─ controllers/
  │   ├─ organization.controller.ts
  │   └─ organizationMember.controller.ts
  ├─ services/
  │   ├─ organization.service.ts
  │   └─ organizationMember.service.ts
  ├─ routes/
  │   └─ organization.routes.ts
  ├─ middlewares/
  │   └─ organizationAccess.middleware.ts
  └─ types/
      └─ organization.types.ts
```

---

## 🔐 Phase 3: Authentication & Authorization Changes

### 3.1 JWT Payload Changes

**OLD:**

```typescript
{
  userId: string;
  role: "ORGANISATION" | "ADMIN" | "SUPERADMIN";
}
```

**NEW:**

```typescript
{
  userId: string;
  // Role is NOT in JWT - it's context-dependent per organization
}
```

---

### 3.2 NEW: Organization Context Middleware

**File:** `server/src/modules/organization/middlewares/organizationAccess.middleware.ts`

```typescript
// Validates user has access to organization
// Attaches organizationId and role to request

interface RequestWithOrgContext extends Request {
  user: { userId: string }
  organization: {
    organizationId: string
    role: "OWNER" | "ADMIN" | "MEMBER"
  }
}

// Middleware functions:
- requireOrganization(orgIdFromParam: string)
- requireRole("OWNER" | "ADMIN" | "MEMBER")
```

**Usage Example:**

```typescript
router.post(
  "/:organizationId/workspaces/connect",
  protect, // Verify JWT
  requireOrganization("organizationId"), // Verify access to org
  requireRole("OWNER", "ADMIN"), // Must be OWNER or ADMIN
  connectWorkspaceHandler,
);
```

---

### 3.3 Update Auth Middleware

**File:** `server/src/modules/auth/middlewares/auth.middleware.ts`

**OLD:**

```typescript
export const protect = (allowedRole: UserRole) => { ... }
```

**NEW:**

```typescript
// Just verify JWT, no role checking (role is org-specific now)
export const protect = async (req, res, next) => {
  // Verify access token
  // Attach req.user = { userId }
};
```

---

## 🛣️ Phase 4: API Routes Refactoring

### 4.1 NEW: Organization Routes

```
POST   /api/v1/organizations                     - Create new organization
GET    /api/v1/organizations                     - Get all orgs user belongs to
GET    /api/v1/organizations/:organizationId     - Get single organization
PATCH  /api/v1/organizations/:organizationId     - Update organization
DELETE /api/v1/organizations/:organizationId     - Delete organization (OWNER only)

POST   /api/v1/organizations/:organizationId/members       - Invite user to org
GET    /api/v1/organizations/:organizationId/members       - List org members
PATCH  /api/v1/organizations/:organizationId/members/:userId - Update member role
DELETE /api/v1/organizations/:organizationId/members/:userId - Remove member
```

---

### 4.2 REFACTOR: Slack Routes

**OLD:**

```
GET  /api/v1/slack/oauth/start?user_id=xxx
GET  /api/v1/slack/oauth/callback
GET  /api/v1/slack/workspaces
```

**NEW:**

```
GET  /api/v1/slack/oauth/start?organization_id=xxx
GET  /api/v1/slack/oauth/callback
GET  /api/v1/organizations/:organizationId/workspaces
GET  /api/v1/organizations/:organizationId/workspaces/:workspaceId
DELETE /api/v1/organizations/:organizationId/workspaces/:workspaceId
```

---

### 4.3 REFACTOR: Groups Routes

**OLD:**

```
GET  /api/v1/groups/:workspaceId
POST /api/v1/groups
```

**NEW:**

```
GET  /api/v1/organizations/:organizationId/workspaces/:workspaceId/groups
POST /api/v1/organizations/:organizationId/workspaces/:workspaceId/groups
GET  /api/v1/organizations/:organizationId/workspaces/:workspaceId/groups/:groupId
```

---

### 4.4 Updated Routes Summary

```
/api/v1/
  /auth
    POST   /signup                          - Create account
    POST   /login                           - Login
    POST   /refresh                         - Refresh token
    POST   /logout                          - Logout
    GET    /me                              - Get current user + organizations

  /organizations
    POST   /                                - Create organization (auto-OWNER)
    GET    /                                - List user's organizations
    GET    /:orgId                          - Get organization details
    PATCH  /:orgId                          - Update organization
    DELETE /:orgId                          - Delete organization (OWNER only)

    POST   /:orgId/members                 - Invite user
    GET    /:orgId/members                 - List members
    PATCH  /:orgId/members/:userId         - Update role
    DELETE /:orgId/members/:userId         - Remove member

    GET    /:orgId/workspaces              - List connected workspaces
    GET    /:orgId/workspaces/:wsId        - Get workspace details
    DELETE /:orgId/workspaces/:wsId        - Disconnect workspace

    GET    /:orgId/workspaces/:wsId/groups           - List groups
    POST   /:orgId/workspaces/:wsId/groups           - Create group
    GET    /:orgId/workspaces/:wsId/groups/:groupId  - Get group
    PATCH  /:orgId/workspaces/:wsId/groups/:groupId  - Update group
    DELETE /:orgId/workspaces/:wsId/groups/:groupId  - Delete group

    GET    /:orgId/workspaces/:wsId/groups/:groupId/games        - List games
    POST   /:orgId/workspaces/:wsId/groups/:groupId/games        - Create game
    GET    /:orgId/workspaces/:wsId/groups/:groupId/games/:gameId - Get game
    PATCH  /:orgId/workspaces/:wsId/groups/:groupId/games/:gameId - Update game
    DELETE /:orgId/workspaces/:wsId/groups/:groupId/games/:gameId - Delete game

  /slack
    GET  /oauth/start?organization_id=xxx  - Start OAuth
    GET  /oauth/callback                   - OAuth callback

  /slack-game
    POST /interactions                     - Slack button interactions (unchanged)
    GET  /:orgId/stats                     - Game statistics
    GET  /:orgId/leaderboard               - Leaderboard
    GET  /:orgId/history                   - Game history
```

---

## 🔄 Phase 5: Business Logic Changes

### 5.1 Slack OAuth Flow

**OLD Flow:**

```
1. User clicks "Connect Slack"
2. Redirect to /slack/oauth/start?user_id=123
3. OAuth callback saves workspace with appUserId
4. Redirect to /onboarding?connected=true
```

**NEW Flow:**

```
1. User selects organization OR creates new one
2. User clicks "Connect Slack Workspace"
3. Redirect to /slack/oauth/start?organization_id=abc123
4. OAuth callback saves workspace with organizationId
5. Redirect to /organizations/:orgId/workspaces?connected=true
```

---

### 5.2 User Signup & Onboarding

**NEW Flow:**

```
Step 1: Signup
POST /auth/signup
{
  email: "john@example.com",
  password: "***",
  firstName: "John",
  lastName: "Doe"
}

Response: { user, tokens }

Step 2: Create Organization (or Join via Invite)
POST /organizations
{
  name: "My Company",
  slug: "my-company"  // auto-generated if not provided
}

Response: { organization }
- User automatically becomes OWNER

Step 3: Connect Slack Workspace
GET /slack/oauth/start?organization_id=xyz

Step 4: Complete Onboarding
PATCH /auth/me
{
  onboardingCompleted: true
}
```

---

### 5.3 Organization Member Invitations

**Flow:**

```
1. Admin invites user by email
POST /organizations/:orgId/members
{
  email: "newuser@example.com",
  role: "ADMIN"
}

2. System checks if user exists:
   - If YES: Create OrganizationMember record
   - If NO: Send invite email with signup link

3. New user signs up with invite token
POST /auth/signup?invite_token=xyz
{
  email: "newuser@example.com",
  password: "***"
}

4. System auto-joins user to organization
```

---

### 5.4 Access Control Examples

**Example 1: Create Group**

```typescript
// User must be ADMIN or OWNER of the organization
router.post(
  "/:orgId/workspaces/:wsId/groups",
  protect,
  requireOrganization("orgId"),
  requireRole("OWNER", "ADMIN"),
  createGroupHandler,
);

async function createGroupHandler(req, res) {
  const { orgId, wsId } = req.params;

  // Verify workspace belongs to organization
  const workspace = await SlackWorkspace.findOne({
    _id: wsId,
    organizationId: orgId,
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  // Create group...
}
```

**Example 2: View Leaderboard**

```typescript
// Any organization member can view
router.get(
  "/:orgId/stats/leaderboard",
  protect,
  requireOrganization("orgId"),
  requireRole("OWNER", "ADMIN", "MEMBER"),
  getLeaderboardHandler,
);
```

---

## 🗄️ Phase 6: Database Migration Strategy

### 6.1 Migration Steps

**Step 1: Create New Collections**

```javascript
// Create Organization collection
// Create OrganizationMember collection
```

**Step 2: Migrate Existing Data**

```javascript
// For each existing AuthUser:
// 1. Create an Organization (name: user's email domain or "Personal Workspace")
// 2. Create OrganizationMember (userId, organizationId, role: OWNER)
// 3. Update all SlackWorkspaces: set organizationId = new organization._id

// Migration script location:
// server/scripts/migrateToMultiTenant.ts
```

**Step 3: Update Schemas**

```javascript
// Update SlackWorkspace model
// Remove appUserId field
// Add organizationId field
```

**Step 4: Clean Up**

```javascript
// Remove role field from AuthUser
// Update indexes
```

---

### 6.2 Migration Script Pseudocode

**File:** `server/scripts/migrateToMultiTenant.ts`

```typescript
async function migrate() {
  // 1. Get all existing AuthUsers
  const users = await AuthUser.find({ role: "ORGANISATION" });

  for (const user of users) {
    // 2. Create organization for each user
    const org = await Organization.create({
      name: `${user.email}'s Organization`,
      slug: generateSlug(user.email),
      subscriptionStatus: "active",
      isActive: true,
    });

    // 3. Make user the OWNER
    await OrganizationMember.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      joinedAt: user.createdAt,
    });

    // 4. Migrate their workspaces
    await SlackWorkspace.updateMany(
      { appUserId: user._id },
      {
        $set: {
          organizationId: org._id,
          connectedBy: user._id,
        },
        $unset: { appUserId: 1 },
      },
    );

    // 5. Update user (remove role)
    await AuthUser.updateOne({ _id: user._id }, { $unset: { role: 1 } });
  }

  console.log("Migration completed!");
}
```

---

## 🎨 Phase 7: Frontend Changes

### 7.1 NEW: Organization Context

**File:** `client/src/contexts/OrganizationContext.tsx`

```typescript
interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (orgId: string) => void;
  loading: boolean;
}

// Store current org in:
// 1. React Context
// 2. localStorage (persist across sessions)
// 3. URL path: /organizations/:orgId/...
```

---

### 7.2 Route Structure Changes

**OLD:**

```
/dashboard
/groups
/groups/:groupId
/onboarding
```

**NEW:**

```
/organizations                          - List/select organization
/organizations/new                      - Create organization
/organizations/:orgId/dashboard         - Organization dashboard
/organizations/:orgId/workspaces        - Workspace management
/organizations/:orgId/workspaces/:wsId/groups
/organizations/:orgId/settings          - Org settings
/organizations/:orgId/members           - Member management
/onboarding                             - First-time setup
```

---

### 7.3 NEW: Organization Selector

**Component:** `client/src/components/OrganizationSelector.tsx`

```tsx
// Dropdown in header/sidebar
// Shows all organizations user belongs to
// Click to switch organization
// Updates context + redirects to new org dashboard
```

---

### 7.4 Updated Components

**Update:**

- `Header` - Add organization selector
- `Sidebar` - Show current organization name
- `SlackConnect` - Pass organizationId to OAuth
- `WorkspaceList` - Fetch by organizationId
- `GroupsPage` - Scoped to organization + workspace
- `OnboardingPage` - Create organization step

**NEW:**

- `OrganizationList` - List all user's organizations
- `CreateOrganizationDialog` - Create new organization
- `OrganizationSettings` - Edit org details
- `MemberManagement` - Invite/remove members
- `OrganizationDashboard` - Overview for selected org

---

### 7.5 API Slice Changes

**File:** `client/src/features/organization/api/organizationApi.ts`

```typescript
export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizations: builder.query<Organization[], void>({ ... }),
    getOrganization: builder.query<Organization, string>({ ... }),
    createOrganization: builder.mutation<Organization, CreateOrgRequest>({ ... }),
    updateOrganization: builder.mutation<Organization, UpdateOrgRequest>({ ... }),
    deleteOrganization: builder.mutation<void, string>({ ... }),

    getOrganizationMembers: builder.query<Member[], string>({ ... }),
    inviteMember: builder.mutation<Member, InviteMemberRequest>({ ... }),
    updateMemberRole: builder.mutation<Member, UpdateRoleRequest>({ ... }),
    removeMember: builder.mutation<void, RemoveMemberRequest>({ ... }),
  })
});
```

---

## 🧪 Phase 8: Testing Strategy

### 8.1 Unit Tests

```
- Organization.model.test.ts
- OrganizationMember.model.test.ts
- organization.service.test.ts
- organizationAccess.middleware.test.ts
```

### 8.2 Integration Tests

```
- Organization CRUD operations
- Member invite/remove flows
- Workspace connection with organization
- Access control (OWNER vs ADMIN vs MEMBER)
- Cross-organization isolation
```

### 8.3 E2E Tests

```
- Complete signup → create org → connect workspace → create group → create game
- Multi-org user switching
- Member invitation flow
- Permission boundaries
```

---

## 🚀 Phase 9: Deployment Strategy

### 9.1 Pre-Deployment Checklist

- [ ] Run migration script on staging database
- [ ] Verify all existing users have organizations
- [ ] Verify all workspaces linked to organizations
- [ ] Test OAuth flow with new organization_id parameter
- [ ] Update Slack app redirect URIs (if needed)
- [ ] Update environment variables
- [ ] Test role-based access control

### 9.2 Deployment Steps

1. **Backend:**
   - Deploy new models (Organization, OrganizationMember)
   - Run migration script
   - Deploy updated API routes
   - Update middleware

2. **Frontend:**
   - Deploy new organization context
   - Deploy updated routing
   - Deploy new components

3. **Database:**
   - Create indexes for new collections
   - Run migration script
   - Verify data integrity

---

## 📝 Phase 10: Backwards Compatibility

### 10.1 Handling Existing Sessions

```typescript
// Option 1: Force re-login (simple)
- Clear all refresh tokens
- Users must log in again
- Auto-create organization on first login

// Option 2: Graceful migration (complex)
- Detect old JWT format
- Auto-create organization
- Issue new JWT with organization context
```

### 10.2 API Versioning

```
Keep /api/v1 for backwards compatibility (deprecated)
Create /api/v2 with new organization-scoped routes
Gradually migrate frontend to v2
Sunset v1 after 3-6 months
```

---

## ⚠️ Important Considerations

### Security

- [ ] Encrypt Slack bot tokens (currently TODO)
- [ ] Rate limiting per organization
- [ ] Audit logs for sensitive operations
- [ ] CSRF protection on state-changing operations

### Performance

- [ ] Index optimization for organization queries
- [ ] Cache organization membership checks
- [ ] Pagination for large organization member lists

### UX

- [ ] Clear organization context in UI
- [ ] Easy organization switching
- [ ] Graceful error messages for permission denials
- [ ] Onboarding tooltips for multi-org features

---

## 📅 Implementation Timeline Estimate

**Phase 1-2: Backend Models & Structure**

- Time: 3-5 days
- Create Organization & OrganizationMember models
- Set up module structure

**Phase 3-4: Auth & API Routes**

- Time: 5-7 days
- Update authentication
- Refactor all routes to be organization-scoped
- Implement middleware

**Phase 5: Business Logic**

- Time: 3-4 days
- Update OAuth flow
- Implement access control
- Update game job to respect org boundaries

**Phase 6: Migration**

- Time: 2-3 days
- Write migration script
- Test on development data
- Document rollback strategy

**Phase 7: Frontend**

- Time: 7-10 days
- Organization context & selector
- Update all pages and components
- New organization management UI

**Phase 8-9: Testing & Deployment**

- Time: 5-7 days
- Unit, integration, E2E tests
- Staging deployment
- Production deployment

**Total: 25-36 days** (5-7 weeks)

---

## 🎯 Success Criteria

- [ ] Multiple companies can install Slack app independently
- [ ] Users can belong to multiple organizations
- [ ] Organization members have different permission levels
- [ ] Workspaces are isolated per organization
- [ ] No data leakage between organizations
- [ ] All existing data migrated successfully
- [ ] Zero downtime deployment
- [ ] Comprehensive test coverage (>80%)

---

## 📚 Reference Documentation

### New Environment Variables

```env
# Organization settings
DEFAULT_TRIAL_PERIOD_DAYS=14
MAX_WORKSPACES_PER_ORG=10  # Optional limit

# Invite system
INVITE_TOKEN_EXPIRY_HOURS=72
```

### Database Collections

```
organizations
organizationMembers
authUsers (updated)
slackWorkspaces (updated)
slackUsers (unchanged)
groups (unchanged)
games (unchanged)
gameSessions (unchanged)
gameMessages (unchanged)
gameResponses (unchanged)
gameTemplates (unchanged)
```

---

## 🔗 Related Documentation

- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)
- [MongoDB Multi-Tenant Data Architecture](https://www.mongodb.com/blog/post/building-multi-tenant-applications-with-mongodb)

---

## ✅ Implementation Status

### ✅ Completed

**Phase 1-2: Database Models & Backend Structure** ✅

- ✅ Organization model created with all required fields
- ✅ OrganizationMember junction table with role-based access
- ✅ AuthUser refactored (removed global role field, added firstName/lastName/avatarUrl)
- ✅ SlackWorkspace refactored (organizationId instead of appUserId, added connectedBy)
- ✅ All models have proper indexes and validation
- ✅ Complete module structure created (controllers, services, routes, middleware, types)

**Phase 3: Authentication & Authorization** ✅

- ✅ JWT simplified to only contain userId (role removed)
- ✅ Organization access middleware created (requireOrganization, requireRole)
- ✅ protect() middleware updated (no longer checks global role)
- ✅ All route files updated to remove UserRole references

**Phase 4: API Routes** ⚠️ Partially Complete

- ✅ Organization CRUD routes implemented (/api/v1/organizations)
- ✅ Organization member management routes (invite, list, update role, remove)
- ✅ Slack OAuth updated to accept organization_id parameter
- ✅ All Slack workspace endpoints updated to verify organization membership
- ⚠️ Groups routes NOT yet organization-scoped (still at /api/v1/groups/:workspaceId)
- ⚠️ Games routes NOT yet organization-scoped
- ⚠️ Slack-game routes NOT yet organization-scoped

**Phase 5: Business Logic** ⚠️ Partially Complete

- ✅ Slack OAuth flow updated to use organization_id
- ✅ Workspace queries properly fetch by organization membership
- ✅ All workspace operations verify organization access
- ⚠️ User signup flow does NOT auto-create organization
- ⚠️ Member invitation system NOT yet implemented
- ⚠️ Game jobs NOT yet updated to respect org boundaries

**Phase 6: Migration** ✅

- ✅ Migration script created (server/scripts/migrateToMultiTenant.ts)
- ✅ Script handles creating org per user, making them OWNER
- ✅ Script updates workspaces with organizationId
- ⚠️ Migration script NOT yet run on actual data

**Phase 7: Frontend** ⚠️ Minimal Progress

- ✅ Organization types created (client/src/features/organization/types)
- ✅ Organization RTK Query API created (basic endpoints)
- ✅ SlackConnect component updated to use organization_id
- ❌ Organization context NOT created
- ❌ Organization selector NOT created
- ❌ Routes NOT updated to organization-scoped paths
- ❌ No organization management UI (list, create, settings, members)
- ❌ Header/Sidebar NOT updated with org selector
- ❌ All pages still use old non-scoped routes

**Phase 8-9: Testing & Deployment** ❌ Not Started

- ❌ No unit tests for organization module
- ❌ No integration tests
- ❌ No E2E tests
- ❌ Not deployed

### 🚧 Incomplete/Pending Work

**CRITICAL - Backend Routes Not Scoped:**

- [ ] Groups routes still at `/api/v1/groups/:workspaceId` instead of `/api/v1/organizations/:orgId/workspaces/:wsId/groups`
- [ ] Games routes still at `/api/v1/groups/:groupId/games` instead of organization-scoped
- [ ] Game templates routes not organization-scoped
- [ ] Slack-game routes not organization-scoped

**Backend Business Logic:**

- [ ] Signup flow doesn't auto-create organization (users must manually create via SlackConnect dialog)
- [ ] Member invitation system not implemented (no email invites, no invite tokens)
- [ ] Game cron jobs don't filter by organization
- [ ] No audit logging for sensitive operations
- [ ] Slack bot tokens not encrypted
- [ ] No rate limiting per organization

**Frontend - Major Work Needed:**

- [ ] Create OrganizationContext provider
- [ ] Create OrganizationSelector component
- [ ] Update all routes to organization-scoped format
- [ ] Create organization management pages:
  - [ ] OrganizationList page
  - [ ] CreateOrganizationDialog
  - [ ] OrganizationSettings page
  - [ ] MemberManagement page
  - [ ] OrganizationDashboard
- [ ] Update Header with organization selector
- [ ] Update Sidebar to show current org
- [ ] Update all existing pages to use organization context
- [ ] Update all API calls to use organization-scoped endpoints

**Testing:**

- [ ] Unit tests for all organization services
- [ ] Integration tests for organization access control
- [ ] E2E tests for multi-org user flows
- [ ] Test cross-organization data isolation

**Deployment:**

- [ ] Run migration script on staging
- [ ] Test all flows with real data
- [ ] Update environment variables
- [ ] Deploy to production

### 🎯 Next Immediate Steps

1. **Complete Backend Route Refactoring** (High Priority)
   - Update groups, games, game-templates routes to be organization-scoped
   - Update all controllers to verify organization access
   - Update slack-game routes

2. **Complete Frontend Foundation** (High Priority)
   - Create OrganizationContext
   - Create OrganizationSelector
   - Update App routing to organization-scoped paths

3. **Build Organization Management UI** (Medium Priority)
   - Organization list and creation
   - Organization settings
   - Member management

4. **Improve Onboarding Flow** (Medium Priority)
   - Auto-create organization on signup
   - Better first-time user experience

5. **Testing & Security** (Before Production)
   - Add comprehensive tests
   - Encrypt Slack tokens
   - Add rate limiting

---

**Last Updated:** February 16, 2026  
**Status:** ~40% Complete - Core backend infrastructure done, routes partially scoped, frontend needs major work  
**Next Steps:** Complete route refactoring → Build frontend foundation → Organization management UI
