import React from "react";
import { useAuth } from "@clerk/react";

interface ShowProps {
  when: "signed-in" | "signed-out";
  children: React.ReactNode;
}

export const Show: React.FC<ShowProps> = ({ when, children }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (when === "signed-in" && isSignedIn) {
    return <>{children}</>;
  }

  if (when === "signed-out" && !isSignedIn) {
    return <>{children}</>;
  }

  return null;
};
