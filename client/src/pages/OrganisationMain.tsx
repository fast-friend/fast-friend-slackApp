import { Navigate, Route, Routes } from "react-router-dom";
import { AuthWrapper } from "@/features/auth";
import Login from "@/features/auth/components/Login";
import ForgotPassword from "@/features/auth/components/ForgotPassword";
import ResetPassword from "@/features/auth/components/ResetPassword";
import SignupPage from "./auth/SignupPage";
import OnboardingPage from "./onboarding/OnboardingPage";
import { DashboardLayout } from "@/components/layout";
import DashboardPage from "./dashboard/DashboardPage";
import UsersPage from "./users/UsersPage";
import ReportsPage from "./reports/ReportsPage";
import SettingsPage from "./settings/SettingsPage";
import { SlackGameDashboard } from "@/features/slack-game/pages/SlackGameDashboard";
import { GroupsPage } from "@/features/groups/pages/GroupsPage";
import { GroupDetailPage } from "@/features/groups/pages/GroupDetailPage";
import { GamesPage } from "@/features/groups/pages/GamesPage";
import {
  WorkspaceRedirect,
  ValidateWorkspace,
} from "@/components/WorkspaceRedirect";
import { OnboardingFormPage } from "@/features/onboarding-form/pages/OnboardingFormPage";

const OrganisationMain = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <AuthWrapper routeType="public" redirectPath="/dashboard">
            <Login />
          </AuthWrapper>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthWrapper routeType="public" redirectPath="/dashboard">
            <ForgotPassword />
          </AuthWrapper>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthWrapper routeType="public" redirectPath="/dashboard">
            <ResetPassword />
          </AuthWrapper>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthWrapper routeType="public" redirectPath="/dashboard">
            <SignupPage />
          </AuthWrapper>
        }
      />

      {/* Public Onboarding Form — accessible via Slack DM link, no auth required */}
      <Route path="/onboard/:token" element={<OnboardingFormPage />} />

      {/* Onboarding Route - Protected but doesn't require onboarding completed */}
      <Route
        path="/onboarding"
        element={
          <AuthWrapper routeType="private" redirectPath="/login">
            <OnboardingPage />
          </AuthWrapper>
        }
      />

      {/* Workspace-scoped Routes */}
      <Route
        path="/workspaces/:workspaceId"
        element={
          <AuthWrapper routeType="private" redirectPath="/login">
            <ValidateWorkspace>
              <DashboardLayout />
            </ValidateWorkspace>
          </AuthWrapper>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="slack-game" element={<SlackGameDashboard />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:groupId" element={<GroupDetailPage />} />
        <Route path="games" element={<GamesPage />} />

        {/* Redirect /workspaces/:workspaceId to /workspaces/:workspaceId/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Redirect old routes to workspace-scoped routes */}
      <Route path="/dashboard" element={<WorkspaceRedirect to="dashboard" />} />
      <Route path="/users" element={<WorkspaceRedirect to="users" />} />
      <Route path="/reports" element={<WorkspaceRedirect to="reports" />} />
      <Route path="/settings" element={<WorkspaceRedirect to="settings" />} />
      <Route
        path="/slack-game"
        element={<WorkspaceRedirect to="slack-game" />}
      />
      <Route path="/groups" element={<WorkspaceRedirect to="groups" />} />
      <Route path="/games" element={<WorkspaceRedirect to="games" />} />
      <Route
        path="/groups/:groupId"
        element={<WorkspaceRedirect to="groups/:groupId" />}
      />

      {/* Default redirect */}
      <Route path="/" element={<WorkspaceRedirect to="dashboard" />} />
      <Route path="*" element={<WorkspaceRedirect to="dashboard" />} />
    </Routes>
  );
};

export default OrganisationMain;
