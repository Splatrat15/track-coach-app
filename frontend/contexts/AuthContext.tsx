/**
 * Auth context: logged-in user (coach or athlete) with persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setUserRole, UserRole } from '../data/user';

const STORAGE_KEY = '@auth_user';

export type AuthUser = {
  role: 'developer' | 'coach' | 'athlete';
  id: string;
  displayName: string;
  developerId?: string;
  coachId?: string;
  athleteId?: string;
  /** True when logged-in coach is a head coach (can edit/delete other coaches). */
  isHeadCoach?: boolean;
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
      await setUserRole(
        user.role === 'developer' ? 'developer' : user.role === 'coach' ? 'coach' : 'athlete'
      );
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
