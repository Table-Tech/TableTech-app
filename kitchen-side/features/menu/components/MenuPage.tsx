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
import { ErrorBoundary } from "@/shared/components/error";
import { useMenu } from "../hooks/useMenu";
import { useCategories } from "../hooks/useCategories";
import { useTranslation } from "@/shared/contexts/LanguageContext";
import { MenuItem } from "@/shared/types";
import { Plus, FolderPlus, Eye, EyeOff } from "lucide-react";

interface MenuPageProps {
  restaurantId: string;
}

export function MenuPage({ restaurantId }: MenuPageProps) {
  const t = useTranslation();
  const {
    menu,
    isLoading,
    error,
    fetchMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
  } = useMenu(restaurantId);
  const { categories, fetchCategories, createCategory } = useCategories(restaurantId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showHiddenItems, setShowHiddenItems] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  // Filter menu based on category and availability
  const getFilteredItems = (items: MenuItem[]) => {
    let filtered = items;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.categoryId === selectedCategory);
    }
    
    // Filter by availability unless showing hidden items
    if (!showHiddenItems) {
      filtered = filtered.filter((item) => item.available);
    }
    
    return filtered;
  };

  const filteredMenu = getFilteredItems(menu);

  // Group menu items by category
  const groupedMenu = selectedCategory === "all" 
    ? categories.reduce((acc, category) => {
        const items = menu.filter(item => item.categoryId === category.id);
        const filteredItems = showHiddenItems ? items : items.filter(item => item.available);
        if (filteredItems.length > 0) {
          acc.push({ category, items: filteredItems });
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
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">{t.menu.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="text-center text-red-600">
          <p>{t.menu.error}: {error}</p>
          <Button onClick={fetchMenu} className="mt-4">
            {t.menu.retry}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#0a3c6e]">{t.menu.menuManagement}</h1>
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            {t.menu.addCategory}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t.menu.addMenuItem}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          restaurantId={restaurantId}
        />
        
        {/* Show Hidden Items Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHiddenItems}
              onChange={(e) => setShowHiddenItems(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showHiddenItems ? 'bg-blue-600' : 'bg-gray-300'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showHiddenItems ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <span className="text-sm font-medium text-gray-700 flex items-center">
              {showHiddenItems ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  {t.menu.showHidden}
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  {t.menu.hideUnavailable}
                </>
              )}
            </span>
          </label>
        </div>
      </div>

      {filteredMenu.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={t.menu.noMenuItemsFound}
          description={t.menu.startByAddingFirstItem}
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              {t.menu.addMenuItem}
            </Button>
          }
        />
      ) : selectedCategory === "all" ? (
        // Display grouped items with category headers
        <ErrorBoundary 
          level="section" 
          name="MenuCategoryGroups"
        >
          <div className="space-y-8">
            {groupedMenu.map(({ category, items }) => (
              <ErrorBoundary 
                key={category.id}
                level="component" 
                name={`MenuCategory-${category.name}`}
              >
                <div className="space-y-4">
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
                    <ErrorBoundary 
                      level="component" 
                      name={`MenuGrid-${category.name}`}
                    >
                      <MenuGrid
                        items={items}
                        onEdit={setEditingItem}
                        onToggleAvailability={toggleMenuItemAvailability}
                        showHiddenItems={showHiddenItems}
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              </ErrorBoundary>
            ))}
          </div>
        </ErrorBoundary>
      ) : (
        // Single category view
        <ErrorBoundary 
          level="section" 
          name="MenuSingleCategory"
        >
          <MenuGrid
            items={filteredMenu}
            onEdit={setEditingItem}
            onToggleAvailability={toggleMenuItemAvailability}
            showHiddenItems={showHiddenItems}
          />
        </ErrorBoundary>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t.menu.addNewMenuItem}
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
        title={t.menu.editMenuItem}
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
        title={t.menu.createNewCategory}
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
