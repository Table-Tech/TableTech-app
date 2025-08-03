"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { apiClient } from "@/shared/services/api-client";
import { Restaurant } from "@/shared/types/restaurant";
import { RequireAuth } from "@/shared/components/protection";
import { Plus, Building2, X } from "lucide-react";
import { useTranslation } from "@/shared/contexts/LanguageContext";

interface AddRestaurantModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddRestaurantModal({ onClose, onSuccess }: AddRestaurantModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Only send fields that have values
      const dataToSend: any = { name: formData.name };
      if (formData.email.trim()) dataToSend.email = formData.email.trim();
      if (formData.phone.trim()) dataToSend.phone = formData.phone.trim();
      if (formData.address.trim()) dataToSend.address = formData.address.trim();
      if (formData.logoUrl.trim()) dataToSend.logoUrl = formData.logoUrl.trim();

      const response = await apiClient.createRestaurant(dataToSend);
      
      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to create restaurant');
      }
    } catch (err) {
      setError('Network error - make sure API is running');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Add Restaurant</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter restaurant name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="restaurant@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="+31 6 12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <p className="text-xs text-gray-500">* Required fields</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectPageContent() {
  const router = useRouter();
  const { user, logout, selectRestaurant } = useAuth();
  const t = useTranslation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);

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
              {t.restaurant.selectRestaurant}
            </h1>
            <p className="text-slate-600 mt-2">
              {t.restaurant.welcome} {user?.name}, {t.restaurant.chooseRestaurant}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddRestaurant(true)}
              className="px-6 py-2 bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {t.restaurant.addRestaurant}
            </button>
            <button
              onClick={logout}
              className="px-6 py-2 bg-red-50 border-2 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {t.nav.logout}
            </button>
          </div>
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

      {/* Add Restaurant Modal */}
      {showAddRestaurant && (
        <AddRestaurantModal 
          onClose={() => setShowAddRestaurant(false)}
          onSuccess={() => {
            setShowAddRestaurant(false);
            loadRestaurants(); // Refresh the restaurant list
          }}
        />
      )}
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
