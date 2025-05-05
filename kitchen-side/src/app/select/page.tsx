'use client'

import { mockRestaurants } from "../../lib/mockdata";
import { useRouter } from "next/navigation";

export default function SelectRestaurantPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Selecteer een Restaurant</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {mockRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => router.push(`/dashboard/${restaurant.id}`)}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition text-gray-800"
            >
              <p className="text-lg font-semibold">{restaurant.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
