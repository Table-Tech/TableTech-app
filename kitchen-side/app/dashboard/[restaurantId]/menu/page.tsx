"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = "http://localhost:3001"; // Pas dit aan indien nodig

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
};

type MenuCategory = {
  id: string;
  name: string;
  menuItems: MenuItem[];
};

export default function MenuPage() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const [categories, setCategories] = useState<MenuCategory[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(
          `${API_URL}/api/menu-categories?restaurantId=${restaurantId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        } else {
          console.error("Fout bij ophalen van categorieën");
        }
      } catch (err) {
        console.error("Netwerkfout:", err);
      }
    };

    fetchData();
  }, [restaurantId]);

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0a3c6e] mb-6">Menuoverzicht</h1>

      {!categories || categories.length === 0 ? (
        <p className="text-gray-600">Geen categorieën gevonden.</p>
      ) : (
        categories.map((category) => (
          <div key={category.id} className="mb-8">
            <h2 className="text-xl font-semibold text-[#12395B] mb-3">
              {category.name}
            </h2>

            {category.menuItems.length === 0 ? (
              <p className="text-gray-500">Geen items in deze categorie.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.menuItems.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded shadow">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium text-[#0a3c6e]">
                        {item.name}
                      </h3>
                      <span className="text-sm text-gray-600">
                        €{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
