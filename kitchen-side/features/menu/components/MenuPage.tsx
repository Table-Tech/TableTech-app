/**
 * Menu Page Component
 * Main menu management page for restaurants
 */

"use client";

import { useState } from 'react';
import { MenuGrid } from './MenuGrid';
import { MenuForm } from './MenuForm';
import { CategoryFilter } from './CategoryFilter';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { useMenu } from '../hooks/useMenu';
import { MenuItem } from '@/shared/types';

interface MenuPageProps {
  restaurantId: string;
}

export function MenuPage({ restaurantId }: MenuPageProps) {
  const { menu, isLoading, error, fetchMenu, createMenuItem, updateMenuItem, deleteMenuItem } = useMenu(restaurantId);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const filteredMenu = selectedCategory === 'all' 
    ? menu 
    : menu.filter(item => item.categoryId === selectedCategory);

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading menu..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <Button onClick={fetchMenu} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#0a3c6e]">Menu Management</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Add Menu Item
        </Button>
      </div>

      <CategoryFilter 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        restaurantId={restaurantId}
      />

      {filteredMenu.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="No menu items found"
          description="Start by adding your first menu item."
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Add Menu Item
            </Button>
          }
        />
      ) : (
        <MenuGrid 
          items={filteredMenu}
          onEdit={setEditingItem}
          onDelete={deleteMenuItem}
        />
      )}

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Menu Item"
      >
        <MenuForm 
          onSubmit={async (data) => {
            await createMenuItem(data);
            setIsCreateModalOpen(false);
          }}
          onCancel={() => setIsCreateModalOpen(false)}
          restaurantId={restaurantId}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Menu Item"
      >
        {editingItem && (
          <MenuForm 
            initialData={editingItem}
            onSubmit={async (data) => {
              await updateMenuItem(editingItem.id, data);
              setEditingItem(null);
            }}
            onCancel={() => setEditingItem(null)}
            restaurantId={restaurantId}
          />
        )}
      </Modal>
    </div>
  );
}