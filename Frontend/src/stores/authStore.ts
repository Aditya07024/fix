import { create } from "zustand";
import { User } from "@/types";
import { AuthApiUser, authAPI } from "@/services/api";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  role: User["role"] | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  syncClerkSession: (token: string) => Promise<void>;
  prepareSyncClerkSession: (token: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
}

const clearStoredAuth = () => {
  console.log("Clearing stored auth");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  localStorage.removeItem("pending_auth_role");
};

const persistAuth = (token: string, user: User) => {
  console.log("Persisting auth:", {
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 20),
    userId: user.id,
    userRole: user.role,
  });
  localStorage.setItem("auth_token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const toDate = (value?: string | Date) => {
  if (!value) {
    return new Date();
  }

  return value instanceof Date ? value : new Date(value);
};

const mapUser = (user: AuthApiUser | User | null | undefined): User | null => {
  if (!user) {
    return null;
  }

  const createdAt =
    "created_at" in user ? user.created_at : (user as User).createdAt;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image || undefined,
    role: user.role,
    needsOnboarding:
      "needs_onboarding" in user
        ? Boolean(user.needs_onboarding)
        : Boolean((user as User).needsOnboarding),
    createdAt: toDate(createdAt),
  };
};

const getStoredAuth = () => {
  const token = localStorage.getItem("auth_token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return { token: null, user: null };
  }

  try {
    return {
      token,
      user: mapUser(JSON.parse(userStr) as User),
    };
  } catch {
    clearStoredAuth();
    return { token: null, user: null };
  }
};

let pendingClerkSyncToken: string | null = null;
let pendingClerkSyncPromise: Promise<void> | null = null;

export const useAuth = create<AuthStore>((set, get) => {
  const storedAuth = getStoredAuth();

  return {
    user: storedAuth.user,
    isAuthenticated: Boolean(storedAuth.user && storedAuth.token),
    role: storedAuth.user?.role || null,
    token: storedAuth.token,
    isLoading: false,
    error: null,

    syncClerkSession: async (token: string) => {
      const currentState = get();
      const pendingRole = localStorage.getItem("pending_auth_role") as
        | "client"
        | "employee"
        | "admin"
        | null;
      const hasCachedSession = Boolean(
        currentState.user && currentState.role && currentState.isAuthenticated,
      );

      if (pendingClerkSyncToken === token && pendingClerkSyncPromise) {
        return pendingClerkSyncPromise;
      }

      const syncPromise = (async () => {
        set({
          token,
          isAuthenticated: Boolean(currentState.user || hasCachedSession),
          isLoading: true,
          error: null,
        });

        try {
          console.log("Syncing Clerk session with backend");
          const response = await authAPI.syncClerkUser(
            token,
            pendingRole || undefined,
          );
          const user = mapUser(response.data?.user);
          const jwtToken = response.data?.token;

          if (!user || !jwtToken) {
            throw new Error("Clerk sync response missing user or token");
          }

          console.log(
            "Sync successful, storing JWT token for subsequent requests",
          );
          persistAuth(jwtToken, user);

          set({
            user,
            token: jwtToken,
            isAuthenticated: true,
            role: user.role,
            isLoading: false,
            error: null,
          });
          localStorage.removeItem("pending_auth_role");
        } catch (error: any) {
          console.error("Auth sync failed:", {
            errorMessage: error?.error || error?.message,
            errorData: error?.data,
            status: error?.status,
          });
          clearStoredAuth();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            role: null,
            isLoading: false,
            error: error?.error || error?.message || "Authentication failed",
          });
          throw error;
        } finally {
          if (pendingClerkSyncToken === token) {
            pendingClerkSyncToken = null;
            pendingClerkSyncPromise = null;
          }
        }
      })();

      pendingClerkSyncToken = token;
      pendingClerkSyncPromise = syncPromise;

      return syncPromise;
    },

    logout: () => {
      clearStoredAuth();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        role: null,
        isLoading: false,
        error: null,
      });
    },

    updateUser: (userData: Partial<User>) => {
      set((state) => {
        if (!state.user) {
          return state;
        }

        const updatedUser = { ...state.user, ...userData };

        if (state.token) {
          persistAuth(state.token, updatedUser);
        } else {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        return {
          user: updatedUser,
          role: updatedUser.role,
        };
      });
    },

    setUser: (user: User | null) => {
      set((state) => {
        if (user && state.token) {
          persistAuth(state.token, user);
        } else if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          clearStoredAuth();
        }

        return {
          user,
          token: user ? state.token : null,
          isAuthenticated: Boolean(user && state.token),
          role: user?.role || null,
        };
      });
    },

    initializeAuth: async () => {
      const state = get();
      // If we don't have a stored session, we need to check with Clerk
      // or if we have a session, we still set loading to prevent race conditions
      if (!state.isAuthenticated || !state.token) {
        console.log("No stored session found, setting isLoading: true");
        set({ isLoading: true });
      }
    },

    prepareSyncClerkSession: async (token: string) => {
      console.log(
        "ClerkSessionSync: Preparing to sync, setting isLoading: true immediately",
      );
      set({ isLoading: true });
      return get().syncClerkSession(token);
    },
  };
});
