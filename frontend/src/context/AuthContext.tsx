import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchCurrentUser,
  loginUser,
  loginWithGoogle as loginWithGoogleApi,
  logoutUser,
  registerUser,
  refreshSession,
  updateProfile as updateProfileApi,
  deleteAccount as deleteAccountApi,
  fetchPreferences,
  updatePreferences as updatePreferencesApi,
  fetchUserStats,
} from "@/services/api";
import type { UserResponse, UserPreferences, UserStats } from "@/services/api";

interface AuthContextType {
  user: UserResponse | null;
  preferences: UserPreferences | null;
  stats: UserStats | null;
  loading: boolean;
  login: (email_or_username: string, password: string, remember_me?: boolean) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (email: string, username: string, password: string, display_name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { display_name?: string; username?: string; email?: string; avatar_url?: string }) => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  refreshStats: () => Promise<void>;
  deleteAccount: (confirmUsername?: string, password?: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserResponse | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        loadUserData();
      }
    } catch (error: any) {
      if (error?.status === 401) {
        try {
          await refreshSession();
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
          if (currentUser) {
            loadUserData();
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [prefsData, statsData] = await Promise.all([
        fetchPreferences().catch(() => null),
        fetchUserStats().catch(() => null),
      ]);
      if (prefsData) setPreferences(prefsData);
      if (statsData) setStats(statsData);
    } catch (e) {
      // Ignore background load errors
    }
  };

  const refreshPreferences = async () => {
    try {
      const prefsData = await fetchPreferences();
      setPreferences(prefsData);
    } catch (e) {
      // Ignore
    }
  };

  const refreshStats = async () => {
    try {
      const statsData = await fetchUserStats();
      setStats(statsData);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email_or_username: string, password: string, remember_me?: boolean) => {
    try {
      const resUser = await loginUser(email_or_username, password, remember_me);
      setUser(resUser);
      loadUserData();
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const resUser = await loginWithGoogleApi(credential);
      setUser(resUser);
      loadUserData();
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string, display_name?: string) => {
    try {
      const resUser = await registerUser(email, username, password, display_name);
      setUser(resUser);
      loadUserData();
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const updateProfile = async (data: { display_name?: string; username?: string; email?: string; avatar_url?: string }) => {
    const updated = await updateProfileApi(data);
    setUser(updated);
  };

  const updatePreferences = async (data: Partial<UserPreferences>) => {
    const updated = await updatePreferencesApi(data);
    setPreferences(updated);
  };

  const deleteAccount = async (confirmUsername?: string, password?: string) => {
    await deleteAccountApi(confirmUsername, password);
    setUser(null);
    setPreferences(null);
    setStats(null);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setPreferences(null);
      setStats(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        stats,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        updatePreferences,
        refreshPreferences,
        refreshStats,
        deleteAccount,
        checkAuth,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

