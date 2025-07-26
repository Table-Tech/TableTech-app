"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = "http://localhost:3001"; // Je oorspronkelijke API

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

export default function MenuList() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const token = localStorage.getItem("token");

    try {
      // Gebruik je oorspronkelijke werkende route
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const handleAddCategory = async () => {
    const name = window.prompt('Naam van nieuwe categorie:');
    if (!name) return;

    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch(`${API_URL}/api/menu-categories`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, restaurantId }),
      });

      if (res.ok) {
        await fetchData(); // Refresh data
      } else {
        alert('Fout bij toevoegen categorie');
      }
    } catch (err) {
      alert('Netwerkfout bij toevoegen categorie');
    }
  };

  const handleAddMenuItem = async (categoryId: string) => {
    const name = window.prompt('Naam van nieuw menu item:');
    if (!name) return;
    
    const priceStr = window.prompt('Prijs (bijv. 12.50):');
    if (!priceStr) return;
    
    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      alert('Ongeldige prijs');
      return;
    }
    
    const description = window.prompt('Beschrijving (optioneel):') || '';

    const token = localStorage.getItem("token");
    
    try {
      // Gebruik je backend API voor menu items
      const res = await fetch(`${API_URL}/api/menu`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          price, 
          description: description || undefined,
          categoryId,
          restaurantId
        }),
      });

      if (res.ok) {
        await fetchData(); // Refresh data
      } else {
        const errorData = await res.json();
        alert(`Fout bij toevoegen menu item: ${errorData.message || 'Onbekende fout'}`);
      }
    } catch (err) {
      alert('Netwerkfout bij toevoegen menu item');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) return;

    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch(`${API_URL}/api/menu-categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchData(); // Refresh data
      } else {
        alert('Fout bij verwijderen categorie');
      }
    } catch (err) {
      alert('Netwerkfout bij verwijderen categorie');
    }
  };

  const handleEditCategory = async (categoryId: string, currentName: string) => {
    const name = window.prompt('Nieuwe naam voor categorie:', currentName);
    if (!name || name === currentName) return;

    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch(`${API_URL}/api/menu-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        await fetchData(); // Refresh data
      } else {
        alert('Fout bij bewerken categorie');
      }
    } catch (err) {
      alert('Netwerkfout bij bewerken categorie');
    }
  };

  if (loading) {
    return <div className="p-6">Menu laden...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#0a3c6e]">Menu</h2>
        <button
          onClick={handleAddCategory}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          + Categorie toevoegen
        </button>
      </div>

      {!categories || categories.length === 0 ? (
        <p className="text-gray-600">Geen categorieën gevonden.</p>
      ) : (
        categories.map((category) => (
          <div key={category.id} className="mb-6 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 
                className="text-lg font-semibold text-[#12395B] cursor-pointer hover:text-blue-600"
                onClick={() => handleEditCategory(category.id, category.name)}
                title="Klik om te bewerken"
              >
                {category.name}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddMenuItem(category.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  + Item toevoegen
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>

            {!category.menuItems || category.menuItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                Geen items in deze categorie.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg p-3 shadow border"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-[#0a3c6e]">
                        {item.name}
                      </h4>
                      <span className="text-sm text-gray-600">
                        €{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">
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