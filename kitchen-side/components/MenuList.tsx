import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { MenuItem } from '@/lib/types';

interface MenuListProps {
  menu: MenuItem[];
  setMenu?: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  canAdd?: boolean;
  currentUser?: { email: string; role: string };
}

export const MenuList: React.FC<MenuListProps> = ({ menu, setMenu, canAdd = false, currentUser }) => {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!setMenu) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const description = (form.elements.namedItem("description") as HTMLInputElement).value;
    const price = parseFloat((form.elements.namedItem("price") as HTMLInputElement).value);
    const image = (form.elements.namedItem("image") as HTMLInputElement).value;

    const newItem: MenuItem = {
      id: `m${menu.length + 1}`,
      name,
      description,
      price,
      isAvailable: true,
      category: { id: 'default', name: 'Default' },
    };

    setMenu([...menu, newItem]);
    form.reset();
    setShowForm(false);
  };

  const groupedMenu = menu.reduce((acc, item) => {
    const categoryName = item.category?.name || "Overig";
    acc[categoryName] = [...(acc[categoryName] || []), item];
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#12395B]">Menu</h1>
        {canAdd && currentUser && ["ADMIN", "SUPER"].includes(currentUser.role) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[#12395B] hover:text-[#0a2e4a] p-2 rounded-full hover:bg-[#e6f0fa]"
          >
            <Plus size={24} />
          </button>
        )}
      </div>
      {Object.keys(groupedMenu).length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items yet</h3>
          <p className="text-gray-600">
            Add your first menu item to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-bold text-[#12395B] mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white shadow rounded-lg space-y-2"
                  >
                    <div className="w-full h-40 relative rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No Image</span>
                    </div>
                    <h3 className="font-semibold text-[#12395B]">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    <p className="text-base font-bold text-gray-600">
                      €{item.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {canAdd && showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            {/* Sluitknop rechtsboven */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-[#12395B] mb-4">
              Nieuw menu-item toevoegen
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="title"
                placeholder="Naam gerecht"
                className="w-full border px-3 py-2 rounded text-gray-800"
                required
              />
              <input
                name="description"
                placeholder="Beschrijving"
                className="w-full border px-3 py-2 rounded text-gray-800"
                required
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="Prijs (€)"
                className="w-full border px-3 py-2 rounded text-gray-800"
                required
              />
              <input
                name="image"
                placeholder="Afbeeldingspad (bijv. /margherita.jpg)"
                className="w-full border px-3 py-2 rounded text-gray-800"
              />
              <button
                type="submit"
                className="bg-[#12395B] text-white px-4 py-2 rounded hover:bg-[#0a2e4a] w-full"
              >
                Toevoegen
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}; 