/**
 * Menu Page Component
 * Main menu management page for restaurants
 */

"use client";

import { useState, useEffect } from "react";
import { MenuGrid } from "./MenuGrid";
import { MenuForm } from "./MenuForm";
import { CategoryForm, CategoryFormData } from "./CategoryForm";
import { CategoryFilter } from "./CategoryFilter";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { useMenu } from "../hooks/useMenu";
import { useCategories } from "../hooks/useCategories";
import { MenuItem } from "@/shared/types";
import { Plus, FolderPlus } from "lucide-react";

interface MenuPageProps {
  restaurantId: string;
}

export function MenuPage({ restaurantId }: MenuPageProps) {
  const {
    menu,
    isLoading,
    error,
    fetchMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  } = useMenu(restaurantId);
  const { categories, fetchCategories, createCategory } = useCategories(restaurantId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  const filteredMenu =
    selectedCategory === "all"
      ? menu
      : menu.filter((item) => item.categoryId === selectedCategory);

  // Group menu items by category
  const groupedMenu = selectedCategory === "all" 
    ? categories.reduce((acc, category) => {
        const items = menu.filter(item => item.categoryId === category.id);
        if (items.length > 0) {
          acc.push({ category, items });
        }
        return acc;
      }, [] as { category: any; items: MenuItem[] }[])
    : [{ 
        category: categories.find(c => c.id === selectedCategory),
        items: filteredMenu 
      }].filter(group => group.category);

  const handleCreateCategory = async (data: CategoryFormData) => {
    try {
      setCategoryLoading(true);
      await createCategory({
        ...data,
        restaurantId: restaurantId
      });
      setIsCategoryModalOpen(false);
      // Optionally refresh menu to update categories in CategoryFilter
      await fetchMenu();
    } catch (error) {
      console.error('Failed to create category:', error);
      // Error handling could be improved with toast notifications
    } finally {
      setCategoryLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading menu...</p>
          </div>
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
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
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
      ) : selectedCategory === "all" ? (
        // Display grouped items with category headers
        <div className="space-y-8">
          {groupedMenu.map(({ category, items }) => (
            <div key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="relative mb-6">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg px-6 py-3 shadow-sm border border-blue-100">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="h-[1px] bg-gradient-to-r from-gray-200 via-gray-200 to-transparent"></div>
                  </div>
                </div>
              </div>
              
              {/* Items Grid */}
              <div className="pl-4">
                <MenuGrid
                  items={items}
                  onEdit={setEditingItem}
                  onDelete={deleteMenuItem}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Single category view
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

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Create New Category"
      >
        <CategoryForm
          onSubmit={handleCreateCategory}
          onCancel={() => setIsCategoryModalOpen(false)}
          isLoading={categoryLoading}
        />
      </Modal>
    </div>
  );
}
