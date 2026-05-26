import { useCallback, useEffect, useState } from 'react';
import { clearSavedUserId, fetchUserById, getSavedUserId } from '../api/auth';
import type { User } from '../types';

export interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedId = getSavedUserId();
    if (!savedId) {
      setLoading(false);
      return;
    }
    fetchUserById(savedId).then(loaded => {
      if (!loaded) clearSavedUserId();
      setUserState(loaded);
      setLoading(false);
    });
  }, []);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
  }, []);

  const logout = useCallback(() => {
    clearSavedUserId();
    setUserState(null);
  }, []);

  return { user, loading, setUser, logout };
}
