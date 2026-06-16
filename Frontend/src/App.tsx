import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useTheme } from "@/stores/themeStore";
import { useAuth } from "@/stores/authStore";
import { UserRole } from "@/types";
import LandingPage from "@/pages/landing/Landing";
import { realtimeNotifications } from "@/services/realtimeNotifications";

const ClientDashboard = lazy(() => import("@/pages/client/Dashboard"));
const EmployeeDashboard = lazy(() => import("@/pages/employee/Dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const LoginPage = lazy(() => import("@/pages/Login"));
const OnboardingPage = lazy(() => import("@/pages/Onboarding"));

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div className="text-center">
      <div className="w-10 h-10 mx-auto mb-md border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

const RouteFallback: React.FC = () => (
  <LoadingScreen message="Loading page..." />
);

const ClerkSessionSync: React.FC = () => {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const prepareSyncClerkSession = useAuth(
    (state) => state.prepareSyncClerkSession,
  );
  const logout = useAuth((state) => state.logout);

  useEffect(() => {
    console.log(
      "ClerkSessionSync: isLoaded=",
      isLoaded,
      "isSignedIn=",
      isSignedIn,
    );

    if (!isLoaded) {
      console.log("ClerkSessionSync: Waiting for Clerk to load");
      return;
    }

    if (!isSignedIn) {
      console.log("ClerkSessionSync: User not signed in, logging out");
      logout();
      return;
    }

    void (async () => {
      try {
        const token = await getToken();
        console.log("ClerkSessionSync: Got Clerk token, preparing sync");

        if (!token) {
          console.log("ClerkSessionSync: No token from Clerk, logging out");
          logout();
          return;
        }

        await prepareSyncClerkSession(token);
        console.log("ClerkSessionSync: Session sync completed");
      } catch (error) {
        console.error("ClerkSessionSync: Error during session sync:", error);
        logout();
      }
    })();
  }, [isLoaded, isSignedIn, getToken, logout, prepareSyncClerkSession]);

  return null;
};

const ProtectedRoute: React.FC<{
  allowedRole: UserRole;
  children: React.ReactElement;
}> = ({ allowedRole, children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { isAuthenticated, role, user, isLoading } = useAuth();
  const hasResolvedLocalSession = isAuthenticated && Boolean(role);

  if (
    (!hasResolvedLocalSession && isLoading) ||
    (!hasResolvedLocalSession && !isLoaded)
  ) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (!isSignedIn || !isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  if (user?.needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to={`/${role}`} replace />;
  }

  return children;
};

const OnboardingRoute: React.FC = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const hasResolvedLocalSession = isAuthenticated && Boolean(role);

  if (
    (!hasResolvedLocalSession && isLoading) ||
    (!hasResolvedLocalSession && !isLoaded)
  ) {
    return <LoadingScreen message="Preparing your account..." />;
  }

  if (!isSignedIn || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.needsOnboarding) {
    return <Navigate to={`/${role}`} replace />;
  }

  return <OnboardingPage />;
};

const RootRedirect: React.FC = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { role, user, isLoading, isAuthenticated } = useAuth();
  const hasResolvedLocalSession = isAuthenticated && Boolean(role);

  if (
    isSignedIn &&
    ((!hasResolvedLocalSession && isLoading) ||
      (!hasResolvedLocalSession && !isLoaded))
  ) {
    return <LoadingScreen message="Loading application..." />;
  }

  if (isLoaded && isSignedIn && role) {
    if (user?.needsOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }

    return <Navigate to={`/${role}`} replace />;
  }

  if (isLoaded && isSignedIn && !role) {
    return <Navigate to="/login" replace />;
  }

  return <LandingPage />;
};

const NotFoundRedirect: React.FC = () => {
  return <Navigate to="/" replace />;
};

const NotificationRealtimeBootstrap: React.FC = () => {
  const { token, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      realtimeNotifications.clearSession();
      return;
    }

    realtimeNotifications.requestPermission(user?.id);
    realtimeNotifications.connect(token);

    return () => {
      realtimeNotifications.disconnect();
    };
  }, [isAuthenticated, token, user?.id]);

  return null;
};

function App() {
  const { setTheme } = useTheme();
  const initializeAuth = useAuth((state) => state.initializeAuth);
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { role, user, isLoading, isAuthenticated } = useAuth();
  const hasResolvedLocalSession = isAuthenticated && Boolean(role);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const appliedTheme = storedTheme || (prefersDark ? "dark" : "light");

    setTheme(appliedTheme);
    document.documentElement.setAttribute("data-theme", appliedTheme);
  }, [setTheme]);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const shouldShowSignedInLoading =
    isSignedIn &&
    ((!hasResolvedLocalSession && isLoading) ||
      (!hasResolvedLocalSession && !isLoaded));

  return (
    <Router>
      <ClerkSessionSync />
      <NotificationRealtimeBootstrap />
      <Routes>
        <Route
          path="/login"
          element={
            shouldShowSignedInLoading ? (
              <LoadingScreen message="Checking your session..." />
            ) : isLoaded && isSignedIn && role ? (
              user?.needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <Navigate to={`/${role}`} replace />
              )
            ) : (
              <Suspense fallback={<RouteFallback />}>
                <LoginPage />
              </Suspense>
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            shouldShowSignedInLoading ? (
              <LoadingScreen message="Checking your session..." />
            ) : isLoaded && isSignedIn && role ? (
              user?.needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <Navigate to={`/${role}`} replace />
              )
            ) : (
              <Suspense fallback={<RouteFallback />}>
                <LoginPage adminOnly />
              </Suspense>
            )
          }
        />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route
          path="/onboarding"
          element={
            <Suspense fallback={<RouteFallback />}>
              <OnboardingRoute />
            </Suspense>
          }
        />
        <Route
          path="/client/*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProtectedRoute allowedRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/employee/*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProtectedRoute allowedRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
