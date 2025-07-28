"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { apiClient } from "@/shared/services/api-client";
import { Restaurant } from "@/shared/types/restaurant";
import { RequireAuth } from "@/shared/components/protection";
import { Plus, Building2 } from "lucide-react";

function SelectPageContent() {
  const router = useRouter();
  const { user, logout, selectRestaurant } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only load restaurants if user is authenticated as SUPER_ADMIN
    if (user && user.role === 'SUPER_ADMIN') {
      loadRestaurants();
    } else if (user && user.role !== 'SUPER_ADMIN') {
      // Regular users shouldn't be on this page
      if (user.restaurant) {
        router.push('/dashboard');
      } else {
        logout(); // Something is wrong, logout
      }
    }
  }, [user, router, logout]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await apiClient.getAllRestaurants();
      
      if (response.success && response.data) {
        setRestaurants(response.data);
      } else {
        setError(response.error || "Failed to load restaurants");
      }
    } catch (err) {
      setError("Network error - make sure API is running");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              Selecteer Restaurant
            </h1>
            <p className="text-slate-600 mt-2">
              Welkom {user?.name}, kies een restaurant om te beheren
            </p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-50 border-2 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Uitloggen
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Restaurant Grid */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => selectRestaurant(restaurant)}
                className="bg-white hover:bg-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200 transition-all hover:shadow-xl hover:scale-105"
              >
                <div className="flex flex-col items-center">
                  {restaurant.logoUrl ? (
                    <img
                      src={restaurant.logoUrl}
                      alt={restaurant.name}
                      className="w-16 h-16 mx-auto mb-4 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                  )}
                  <h3 className="font-semibold text-slate-800 text-lg mb-2">
                    {restaurant.name}
                  </h3>
                  <p className="text-slate-500 text-sm text-center">
                    {restaurant.address}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {restaurant.phone}
                  </p>
                </div>
              </button>
            ))}

            {/* No restaurants message */}
            {restaurants.length === 0 && !error && (
              <div className="col-span-full text-center py-12">
                <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">
                  Geen restaurants gevonden
                </h3>
                <p className="text-slate-500">
                  Er zijn nog geen restaurants beschikbaar in het systeem.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Retry button for errors */}
        {error && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadRestaurants}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              Opnieuw proberen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SelectPage() {
  return (
    <RequireAuth roles={['SUPER_ADMIN']}>
      <SelectPageContent />
    </RequireAuth>
  );
}
