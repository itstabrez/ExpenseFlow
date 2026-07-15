"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { statusLabels, type ClaimDto, type LoginInput, type SafeUser, type SignupInput } from "@expense-flow/shared";
import { useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "@/lib/api";
import { setAccessToken } from "@/lib/auth-token";
import { useToast } from "@/components/toast";
import { getAccessToken } from "@/lib/auth-token";

type AuthContextValue = {
  user: SafeUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthResponse = {
  user: SafeUser;
  accessToken: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const toast = useToast();

  const applyAuth = (data: AuthResponse) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const refreshMe = async () => {
    const response = await api.post<{ success: true; data: AuthResponse }>("/auth/refresh");
    applyAuth(response.data.data);
  };

  useEffect(() => {
    refreshMe()
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    const accessToken = getAccessToken();
    if (!accessToken) {
      return;
    }
    const token = encodeURIComponent(accessToken);
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
    const source = new EventSource(`${base}/events?accessToken=${token}`, { withCredentials: true });
    let showedConnectionError = false;
    source.addEventListener("connected", () => {
      toast.push("Live updates connected", "info");
    });
    source.addEventListener("claim-status", (event) => {
      const claim = JSON.parse(event.data) as ClaimDto;
      queryClient.setQueryData(["claim", claim.id], claim);
      toast.push(`${claim.claimNumber} is now ${statusLabels[claim.status]}`, "info");
      void queryClient.invalidateQueries({ queryKey: ["claims"], refetchType: "active" });
      void queryClient.invalidateQueries({ queryKey: ["claim", claim.id, "history"], refetchType: "active" });
    });
    source.onerror = () => {
      if (!showedConnectionError) {
        showedConnectionError = true;
        toast.push("Live updates disconnected", "error");
      }
    };
    return () => source.close();
  }, [queryClient, toast, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (input) => {
        const response = await api.post<{ success: true; data: AuthResponse }>("/auth/login", input);
        applyAuth(response.data.data);
      },
      signup: async (input) => {
        const response = await api.post<{ success: true; data: AuthResponse }>("/auth/signup", input);
        applyAuth(response.data.data);
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          setAccessToken(null);
          setUser(null);
          queryClient.clear();
        }
      },
      refreshMe
    }),
    [loading, queryClient, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

export const useAuthError = () => apiErrorMessage;
