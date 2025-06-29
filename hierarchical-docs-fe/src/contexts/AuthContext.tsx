import React, { useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/app.types';
import { AuthContext } from './AuthContext.context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const logout = () => {
    setUser(null);
    setToken(null);
    // TODO: Xóa token khỏi localStorage
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
