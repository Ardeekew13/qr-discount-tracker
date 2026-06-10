'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { client } from '@/lib/apollo-client';

const ME_QUERY = gql`
  query Me {
    me {
      _id
      username
      role
      fullName
      email
      status
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      success
      message
      user {
        _id
        username
        role
        fullName
        email
        status
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

interface User {
  _id: string;
  username: string;
  role: 'admin' | 'staff';
  fullName: string;
  email?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { data, loading: queryLoading, error } = useQuery(ME_QUERY, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!queryLoading) {
      if (data?.me) {
        setUser(data.me);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, [data, queryLoading, error]);

  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const { data } = await loginMutation({ variables: { username, password } });
      if (data.login.success) {
        setUser(data.login.user);
        return { success: true, message: data.login.message };
      }
      return { success: false, message: data.login.message };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  }, [loginMutation]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation();
    } finally {
      setUser(null);
      await client.clearStore();
    }
  }, [logoutMutation]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
