import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  refreshSession,
} from "@/services/api";
import type { UserResponse } from "@/services/api";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      if (error?.status === 401) {
        try {
          await refreshSession();
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
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

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await loginUser(username, password);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      await registerUser(username, password);
      await loginUser(username, password);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
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
