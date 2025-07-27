"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiClient } from '@/shared/services/api-client';
import { Restaurant } from '@/shared/types/restaurant';

export default function RestaurantSelectPage() {
  const { user, selectRestaurant, selectedRestaurantId } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Redirect if not SUPER_ADMIN
    if (user && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    // Redirect if already selected a restaurant
    if (selectedRestaurantId) {
      router.push(`/dashboard/${selectedRestaurantId}`);
      return;
    }

    fetchRestaurants();
  }, [user, selectedRestaurantId, router]);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getAllRestaurants();
      
      if (response.success && response.data) {
        setRestaurants(response.data);
      } else {
        setError(response.error || 'Failed to fetch restaurants');
      }
    } catch (error) {
      setError('Network error - make sure API is running');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestaurantSelect = (restaurantId: string) => {
    selectRestaurant(restaurantId);
    router.push(`/dashboard/${restaurantId}`);
  };

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchRestaurants}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Select Restaurant</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {user.name}! Choose a restaurant to manage.
            </p>
          </div>

          {restaurants.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏪</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
              <p className="text-gray-600">
                There are no restaurants in the system yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
                  onClick={() => handleRestaurantSelect(restaurant.id)}
                >
                  <div className="p-6">
                    {restaurant.logoUrl && (
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <img
                          src={restaurant.logoUrl}
                          alt={restaurant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                    )}
                    {!restaurant.logoUrl && (
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-2xl font-bold">
                          {restaurant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                      {restaurant.name}
                    </h3>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="flex items-center justify-center">
                        <span className="mr-2">📍</span>
                        {restaurant.address}
                      </p>
                      <p className="flex items-center justify-center">
                        <span className="mr-2">📞</span>
                        {restaurant.phone}
                      </p>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                      Manage Restaurant
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}