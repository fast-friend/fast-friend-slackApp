import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { useGetCurrentUserQuery } from "../api/authApi";
import type { IAuthWrapperProps } from "../types/auth.types";

/**
 * AuthWrapper component for protecting routes based on authentication
 *
 * @param children - The component to render if auth conditions are met
 * @param routeType - "public" for login/signup pages, "private" for protected pages
 * @param redirectPath - Where to redirect based on auth state
 */
const AuthWrapper: React.FC<IAuthWrapperProps> = ({
  children,
  routeType,
  redirectPath,
}) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth,
  );

  // Fetch current user on mount
  const { isLoading: isFetching, isError } = useGetCurrentUserQuery(undefined, {
    // Skip if we already have user data and are authenticated
    skip: isAuthenticated && !!user,
  });

  // Show loading state while checking auth
  if (isLoading || isFetching) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Handle public routes (login, signup, etc.)
  if (routeType === "public") {
    // If user is authenticated, check onboarding status
    if (isAuthenticated && user) {
      // If email not verified, allow access to public routes
      if (!user.emailVerified) {
        return <>{children}</>;
      }

      // If email verified but onboarding not completed, redirect to onboarding
      if (!user.onboardingCompleted) {
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
      }

      // If fully onboarded, redirect to dashboard
      return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }
    // Allow access to public route
    return <>{children}</>;
  }

  // Handle private routes
  if (routeType === "private") {
    // If not authenticated or error fetching user, redirect to login
    if (!isAuthenticated || isError) {
      return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }

    // Check if user needs to complete onboarding (but not on onboarding page)
    if (
      user &&
      !user.onboardingCompleted &&
      !location.pathname.startsWith("/onboarding")
    ) {
      return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }

    // User is authenticated, render children
    return <>{children}</>;
  }

  // Fallback - render children
  return <>{children}</>;
};

export default AuthWrapper;
