/**
 * Auth context: logged-in user (coach or athlete) with persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setUserRole, UserRole } from '../data/user';

const STORAGE_KEY = '@auth_user';

export type AuthUser = {
  role: 'coach' | 'athlete';
  id: string;
  displayName: string;
  coachId?: string;
  athleteId?: string;
};

type AuthContextType = {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredUser: () => Promise<void>;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const setCurrentUser = useCallback(async (user: AuthUser | null) => {
    setCurrentUserState(user);
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      await setUserRole(user.role as UserRole);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadStoredUser = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        setCurrentUserState(user);
        await setUserRole(user.role as UserRole);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading auth user:', error);
      setIsLoaded(true);
    }
  }, []);

  const logout = useCallback(async () => {
    setCurrentUserState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    await setUserRole('coach'); // default after logout
  }, []);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        logout,
        loadStoredUser,
        isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
