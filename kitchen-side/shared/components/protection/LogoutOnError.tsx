"use client";

import { useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

interface LogoutOnErrorProps {
  error?: Error | null;
  shouldLogout?: boolean;
}

export function LogoutOnError({ error, shouldLogout = false }: LogoutOnErrorProps) {
  const { logout } = useAuth();

  useEffect(() => {
    if (shouldLogout || (error && error.message.includes('401'))) {
      // Auto logout on authentication errors
      logout();
    }
  }, [error, shouldLogout, logout]);

  return null; // This is just a utility component
}

// Hook version for easier use
export function useLogoutOnError() {
  const { logout } = useAuth();

  return (error?: Error | null, shouldLogout?: boolean) => {
    if (shouldLogout || (error && error.message.includes('401'))) {
      logout();
    }
  };
}