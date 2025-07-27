/**
 * MenuList Component
 * Displays menu items grouped by category with add functionality
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { MenuItem } from '@/shared/types';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { EmptyState } from '@/shared/components/ui/EmptyState';

interface MenuListProps {
  menu: MenuItem[];
  setMenu?: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  canAdd?: boolean;
  currentUser?: { email: string; role: string };
}

export function MenuList({ menu, setMenu, canAdd = false, currentUser }: MenuListProps) {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!setMenu) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const newItem: MenuItem = {
      id: `m${menu.length + 1}`,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseFloat(formData.get("price") as string),
      isAvailable: true,
      available: true,
      category: { id: 'default', name: 'Default' },
      categoryId: 'default',
      imageUrl: undefined,
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
        {canAdd && currentUser && ["ADMIN", "SUPER", "SUPER_ADMIN", "MANAGER", "CHEF"].includes(currentUser.role) && (
          <Button
            onClick={() => setShowForm(true)}
            variant="ghost"
            className="text-[#12395B] hover:text-[#0a2e4a] p-2 rounded-full hover:bg-[#e6f0fa]"
          >
            <Plus size={24} />
          </Button>
        )}
      </div>
      
      {Object.keys(groupedMenu).length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="No menu items yet"
          description="Add your first menu item to get started."
          action={canAdd && currentUser ? {
            label: "Add Menu Item",
            onClick: () => setShowForm(true)
          } : undefined}
        />
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
      
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nieuw menu-item toevoegen"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="name"
            label="Naam gerecht"
            placeholder="Naam gerecht"
            required
          />
          <Input
            name="description"
            label="Beschrijving"
            placeholder="Beschrijving"
            required
          />
          <Input
            name="price"
            type="number"
            step="0.01"
            label="Prijs"
            placeholder="Prijs (€)"
            required
          />
          <Input
            name="image"
            label="Afbeelding"
            placeholder="Afbeeldingspad (bijv. /margherita.jpg)"
          />
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Toevoegen
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}