"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserProfileContextType {
  profile: UserProfile;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
  navigateToAccount: () => void;
  navigateToSettings: () => void;
}

export const UserProfileContext = createContext<
  UserProfileContextType | undefined
>(undefined);

export function useUserProfile(): UserProfileContextType {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error(
      "useUserProfile must be used within a UserProfileProvider"
    );
  }
  return context;
}

interface UserProfileProviderProps {
  profile: UserProfile;
  children: React.ReactNode;
}

export function UserProfileProvider({
  profile,
  children,
}: UserProfileProviderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await fetch("/auth/signout", { method: "POST" });
    } finally {
      router.push("/auth");
      router.refresh();
    }
  }, [router]);

  const navigateToAccount = useCallback(() => {
    router.push("/account");
  }, [router]);

  const navigateToSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        isSigningOut,
        signOut,
        navigateToAccount,
        navigateToSettings,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}
