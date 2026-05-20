import { Document, Types } from "mongoose";
import { PlanType, SubscriptionStatus } from "../../../modules/billing/types/billing.types";

export enum OrganizationRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export interface IOrganization {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
  departments: string[];
  roles: string[];
  // Billing
  plan: PlanType;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus | null;
  currentPeriodEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationDocument extends IOrganization, Document {
  _id: Types.ObjectId;
}

export interface IOrganizationMember {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: OrganizationRole;
  invitedBy?: Types.ObjectId;
  joinedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationMemberDocument
  extends IOrganizationMember, Document {
  _id: Types.ObjectId;
}

// Request/Response types
export interface ICreateOrganizationRequest {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  departments?: string[];
  roles?: string[];
}

export interface IUpdateOrganizationRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  departments?: string[];
  roles?: string[];
}

export interface IInviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface IUpdateMemberRoleRequest {
  role: OrganizationRole;
}

export interface IOrganizationWithRole extends IOrganization {
  userRole: OrganizationRole;
}
