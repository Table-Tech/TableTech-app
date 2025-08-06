"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/shared/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Home page - isLoading:', isLoading, 'user:', user);
    }
    
    if (isLoading) return;
    
    // Add a small delay to prevent race conditions
    const timer = setTimeout(() => {
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('No user, redirecting to login');
        }
        router.replace("/login");
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('User found:', user.role, user.restaurant?.id);
        }
        // Check user role and redirect appropriately
        if (user.role === 'SUPER_ADMIN') {
          if (process.env.NODE_ENV === 'development') {
            console.log('SUPER_ADMIN - redirecting to select');
          }
          router.replace("/select");
        } else if (user.restaurant?.id) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Regular user with restaurant - redirecting to dashboard');
          }
          router.replace("/dashboard");
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('User without restaurant - redirecting to login');
          }
          router.replace("/login");
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}