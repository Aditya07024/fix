import { useMemo } from "react";
import { useAuth } from "@/stores/authStore";
import { User, UserRole } from "@/types";

interface UseAuthGuardOptions {
  /**
   * Required role(s) - if not provided, just checks authentication
   * Pass single role as string or array of roles
   */
  role?: UserRole | UserRole[];

  /**
   * If true, will not require specific role (only authenticated)
   */
  onlyAuthenticated?: boolean;
}

interface UseAuthGuardResult {
  /**
   * True if user is allowed to access the component
   * - If no role required: checks isAuthenticated && !isLoading
   * - If role required: checks role matches && !isLoading
   */
  isAllowed: boolean;

  /**
   * True if auth state is still loading
   * Use to show loading spinner/skeleton
   */
  isLoading: boolean;

  /**
   * Current authenticated user, or null
   */
  user: User | null;

  /**
   * Current user role or null
   */
  role: UserRole | null;

  /**
   * Whether user is authenticated
   */
  isAuthenticated: boolean;

  /**
   * Reason why access is denied (for logging/debugging)
   */
  denialReason: string | null;
}

/**
 * Production-level auth guard hook
 *
 * Usage examples:
 *
 * // Check if user is authenticated
 * const { isAllowed } = useAuthGuard();
 * if (!isAllowed) return <Navigate to="/login" />;
 *
 * // Check if user is admin
 * const { isAllowed } = useAuthGuard({ role: "admin" });
 * if (!isAllowed) return <Navigate to="/client" />;
 *
 * // Check if user is admin or employee
 * const { isAllowed } = useAuthGuard({ role: ["admin", "employee"] });
 *
 * // Show loading while checking
 * const { isAllowed, isLoading } = useAuthGuard({ role: "admin" });
 * if (isLoading) return <LoadingScreen />;
 * if (!isAllowed) return <Navigate to="/login" />;
 */
export const useAuthGuard = (
  options?: UseAuthGuardOptions | UserRole,
): UseAuthGuardResult => {
  const { isLoading, isAuthenticated, user, role } = useAuth();

  // Allow passing role directly as string for convenience
  const opts: UseAuthGuardOptions =
    typeof options === "string"
      ? { role: options, onlyAuthenticated: false }
      : options || { onlyAuthenticated: true };

  // Normalize role to array for easier checking
  const requiredRoles: UserRole[] = opts.role
    ? Array.isArray(opts.role)
      ? opts.role
      : [opts.role]
    : [];

  // Calculate if user is allowed
  const result = useMemo(() => {
    // Still loading - not yet determined
    if (isLoading) {
      return {
        isAllowed: false,
        denialReason: "Auth state loading",
      };
    }

    // Not authenticated
    if (!isAuthenticated || !user || !role) {
      return {
        isAllowed: false,
        denialReason: "Not authenticated",
      };
    }

    // No specific role required - just authenticated
    if (requiredRoles.length === 0) {
      return {
        isAllowed: true,
        denialReason: null,
      };
    }

    // Check if user role matches required role(s)
    if (!requiredRoles.includes(role)) {
      return {
        isAllowed: false,
        denialReason: `Role mismatch: user is ${role}, required ${requiredRoles.join(" or ")}`,
      };
    }

    // All checks passed
    return {
      isAllowed: true,
      denialReason: null,
    };
  }, [isLoading, isAuthenticated, user, role, requiredRoles]);

  return {
    isAllowed: result.isAllowed,
    isLoading,
    user: user || null,
    role,
    isAuthenticated,
    denialReason: result.denialReason,
  };
};

/**
 * Convenience hook for checking admin access
 */
export const useAdminGuard = (): UseAuthGuardResult => {
  return useAuthGuard({ role: "admin" });
};

/**
 * Convenience hook for checking employee access
 */
export const useEmployeeGuard = (): UseAuthGuardResult => {
  return useAuthGuard({ role: "employee" });
};

/**
 * Convenience hook for checking client access
 */
export const useClientGuard = (): UseAuthGuardResult => {
  return useAuthGuard({ role: "client" });
};
