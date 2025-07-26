"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = "http://localhost:3001";

export default function SelectPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 👉 Restaurants ophalen
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/restaurants`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log('Restaurants response:', data); // Debug log
        
        // Handle different response structures
        if (Array.isArray(data)) {
          setRestaurants(data);
        } else if (data.data && Array.isArray(data.data)) {
          setRestaurants(data.data);
        } else if (data.restaurants && Array.isArray(data.restaurants)) {
          setRestaurants(data.restaurants);
        } else {
          console.error("Unexpected response structure:", data);
          setRestaurants([]);
        }
      } catch (err) {
        console.error("Fout bij ophalen restaurants:", err);
        setRestaurants([]);
      }
    };

    fetchRestaurants();
  }, []);

  // 👉 Nieuw restaurant toevoegen
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Valideer required fields (alleen name en email zijn verplicht)
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const address = formData.get("address") as string;
    const phone = formData.get("phone") as string;
    const logoUrl = formData.get("logoUrl") as string;
    
    if (!name.trim()) {
      alert("Restaurant naam is verplicht");
      setLoading(false);
      return;
    }
    
    if (!email.trim()) {
      alert("E-mailadres is verplicht");
      setLoading(false);
      return;
    }
    
    // Bouw restaurant data object - alleen verstuur velden die ingevuld zijn
    const now = new Date().toISOString();
    const restaurantData: any = {
      name: name.trim(),
      email: email.trim(),
      createdAt: now, // Voeg automatisch createdAt toe
      updatedAt: now, // Voeg automatisch updatedAt toe
    };

    // Voeg optionele velden toe als ze ingevuld zijn
    if (address && address.trim()) {
      restaurantData.address = address.trim();
    }
    
    if (phone && phone.trim()) {
      restaurantData.phone = phone.trim();
    }
    
    if (logoUrl && logoUrl.trim()) {
      restaurantData.logoUrl = logoUrl.trim();
    }

    console.log('Sending restaurant data:', restaurantData); // Debug log

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/restaurants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(restaurantData),
      });

      const data = await res.json();
      console.log('Response data:', data); // Debug log
      
      if (!res.ok) {
        // Betere error handling
        let errorMessage = "Onbekende fout";
        
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.code === 'VALIDATION_ERROR') {
            errorMessage = "Validatiefout: Controleer of alle velden correct zijn ingevuld";
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        alert("Fout bij toevoegen restaurant: " + errorMessage);
        return;
      }

      // Handle different response structures
      let newRestaurant;
      if (data.data) {
        newRestaurant = data.data;
      } else if (data.restaurant) {
        newRestaurant = data.restaurant;
      } else {
        newRestaurant = data;
      }

      setRestaurants((prev) => [...prev, newRestaurant]);
      form.reset();
      setShowForm(false);
      alert("Restaurant succesvol toegevoegd!");
    } catch (err) {
      console.error("Fout bij POST:", err);
      alert("Netwerkfout bij toevoegen restaurant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Selecteer een Restaurant
      </h1>

      <div className="flex gap-6 flex-wrap justify-center max-w-6xl">
        {restaurants.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/dashboard/${r.id}`)}
            className="bg-white hover:bg-gray-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 w-72 text-left"
          >
            <div className="flex flex-col items-center text-center mb-4">
              <img
                src={r.logoUrl || "/default-restaurant-logo.png"}
                alt={r.name}
                className="w-16 h-16 mx-auto mb-3 object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = "/default-restaurant-logo.png";
                }}
              />
              <h3 className="font-bold text-lg text-[#12395B] mb-2">{r.name}</h3>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              {r.address && (
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  {r.address}
                </p>
              )}
              {r.phone && (
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  {r.phone}
                </p>
              )}
              {r.email && (
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  {r.email}
                </p>
              )}
            </div>
          </button>
        ))}

        {/* Plus knop */}
        <button
          onClick={() => setShowForm(true)}
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:bg-gray-50 hover:border-gray-400 p-6 rounded-xl w-72 h-64 text-[#12395B] transition-all duration-200"
        >
          <Plus size={48} className="mb-4 text-gray-400" />
          <span className="font-semibold text-lg">Nieuw restaurant</span>
          <span className="text-sm text-gray-500 mt-1">Klik om toe te voegen</span>
        </button>
      </div>

      {/* Formulier Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#12395B]">
                  Nieuw restaurant toevoegen
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant naam *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Bijv. Pizzeria Mario"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#12395B] focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Hoofdstraat 123, 1234 AB Amsterdam"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#12395B] focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefoonnummer
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="06-12345678 of 020-1234567"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#12395B] focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mailadres *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="info@restaurant.nl"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#12395B] focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#12395B] focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optioneel - URL naar het restaurant logo
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={loading}
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    className="bg-[#12395B] text-white px-6 py-2 rounded-md hover:bg-[#0a2e4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? "Toevoegen..." : "Restaurant toevoegen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}