"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/shared/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.push("/login");
    } else {
      // Check user role and redirect appropriately
      if (user.role === 'ADMIN' && !user.restaurant?.id) {
        // Super admin - can select restaurants
        router.push("/select");
      } else if (user.restaurant?.id) {
        // Staff with restaurant - go directly to dashboard
        router.push(`/dashboard/${user.restaurant.id}`);
      } else {
        // Fallback to select page
        router.push("/select");
      }
    }
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