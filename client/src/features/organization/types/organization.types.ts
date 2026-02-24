export const OrganizationRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type OrganizationRole =
  (typeof OrganizationRole)[keyof typeof OrganizationRole];

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
  departments: string[];
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationWithRole extends Organization {
  userRole: OrganizationRole;
}

export interface OrganizationMember {
  _id: string;
  userId: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    createdAt: string;
  };
  organizationId: string;
  role: OrganizationRole;
  invitedBy?: string;
  joinedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  departments?: string[];
  roles?: string[];
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleRequest {
  role: OrganizationRole;
}
