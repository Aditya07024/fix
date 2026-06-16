import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { Show } from "@/components/ClerkShow";
import { useAuth } from "@/stores/authStore";
import { UserRole } from "@/types";
import logo from "../../assets/logo.png";

interface LoginPageProps {
  adminOnly?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ adminOnly = false }) => {
  const navigate = useNavigate();
  const { role, user, error, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    adminOnly ? "admin" : "client",
  );

  const nextPath =
    !role
      ? "/login"
      : user?.needsOnboarding
      ? "/onboarding"
      : role
        ? `/${role}`
        : "/";

  const roleDescription = useMemo(() => {
    if (adminOnly) {
      return "Admin sign-in only. Client and employee access is handled from the normal login page.";
    }

    if (selectedRole === "employee") {
      return "New employee accounts are created in pending review state.";
    }

    if (selectedRole === "admin") {
      return "Admin sign-in is allowed, but new admin accounts are not self-created.";
    }

    return "New client accounts can be created directly with Google.";
  }, [adminOnly, selectedRole]);

  useEffect(() => {
    if (adminOnly) {
      setSelectedRole("admin");
    }
  }, [adminOnly]);

  const persistSelectedRole = () => {
    localStorage.setItem("pending_auth_role", selectedRole);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 flex items-center justify-center px-md py-lg">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-48 -left-48 blur-3xl" />
        <div className="absolute w-96 h-96 bg-white/10 rounded-full -bottom-48 -right-48 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-xl sm:p-3xl backdrop-blur-xl">
          <div className="flex-col-center mb-2xl">
            <img
              src={logo}
              alt="TotalFix27x7 logo"
              className="w-16 h-16 rounded-2xl object-contain mb-md"
            />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {adminOnly ? "TotalFix27x7 Admin" : "TotalFix27x7"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-sm text-center">
              {adminOnly
                ? "Continue with Clerk using the admin Google account."
                : "Continue with Clerk using your Google account."}
            </p>
          </div>

          {error && (
            <div className="mb-lg rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <Show when="signed-out">
            <div className="space-y-md">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-sm">
                  Select Role
                </label>
                <div
                  className={`gap-sm rounded-lg bg-gray-100 p-xs dark:bg-gray-800 ${
                    adminOnly ? "grid grid-cols-1" : "grid grid-cols-2"
                  }`}
                >
                  {(adminOnly
                    ? (["admin"] as UserRole[])
                    : (["client", "employee"] as UserRole[])
                  ).map(
                    (roleOption) => (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => setSelectedRole(roleOption)}
                        className={`rounded-md px-md py-sm text-sm font-medium capitalize transition-colors ${
                          selectedRole === roleOption
                            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-50"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {roleOption}
                      </button>
                    ),
                  )}
                </div>
                <p className="mt-sm text-xs text-gray-600 dark:text-gray-400">
                  {roleDescription}
                </p>
              </div>

              <SignInButton forceRedirectUrl="/">
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={persistSelectedRole}
                >
                  Login With Google
                </Button>
              </SignInButton>

              {!adminOnly && selectedRole !== "admin" && (
                <SignUpButton forceRedirectUrl="/">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={persistSelectedRole}
                  >
                    Create Account With Google
                  </Button>
                </SignUpButton>
              )}

              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                {adminOnly
                  ? "Admins can only sign in here. New admin accounts are not self-created."
                  : "After sign-up, TotalFix27x7 will ask for any missing profile details before opening your dashboard."}
              </p>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="space-y-lg">
              <div className="rounded-lg border border-green-200 bg-green-50 px-md py-md dark:border-green-900 dark:bg-green-950">
                <div className="flex items-center justify-between gap-md">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      You are signed in.
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-xs">
                      {role
                        ? "Use your TotalFix27x7 dashboard or sign out from the account menu."
                        : "Your Clerk session is active, but TotalFix27x7 is still waiting for backend account sync."}
                    </p>
                  </div>
                  <UserButton />
                </div>
              </div>

              {role ? (
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  onClick={() => navigate(nextPath)}
                >
                  Continue To Dashboard
                </Button>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-md py-md text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  TotalFix27x7 could not finish loading your account yet. If this keeps happening, the backend or database is still unavailable.
                </div>
              )}
            </div>
          </Show>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-md mt-lg">
            <div className="flex items-start gap-sm">
              <ShieldCheck
                size={18}
                className="text-blue-700 dark:text-blue-300 mt-0.5"
              />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                {adminOnly ? (
                  <>
                    This page is reserved for{" "}
                    <span className="font-semibold">admin sign-in</span> only.
                  </>
                ) : (
                  <>
                    Existing TotalFix27x7 users keep their stored role. New Clerk
                    sign-ups use the role selected above, while{" "}
                    <span className="font-semibold">admin</span> access is only
                    available from the dedicated admin access page.
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(adminOnly ? "/login" : "/")}
            className="mt-lg w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 inline-flex items-center justify-center gap-xs"
          >
            {adminOnly ? "Back to login" : "Back to home"}
            <ArrowRight size={16} />
          </button>
        </div>

        <p className="text-center text-white text-sm mt-lg">
          © 2024 TotalFix27x7 Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
