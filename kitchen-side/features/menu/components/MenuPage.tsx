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
import { Plus, FolderPlus, Eye, EyeOff, MoreVertical, Edit2, Settings2 } from "lucide-react";
import { ModifierGroupsPage } from "./ModifierGroupsPage";

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
  const { categories, fetchCategories, createCategory, updateCategory } = useCategories(restaurantId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showHiddenItems, setShowHiddenItems] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryDropdown, setCategoryDropdown] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showModifierGroups, setShowModifierGroups] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdown && event.target) {
        const target = event.target as Element;
        // Don't close if clicking inside the dropdown
        if (!target.closest('.category-dropdown')) {
          setCategoryDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [categoryDropdown]);

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
      const createData: any = {
        name: data.name,
        description: data.description,
        displayOrder: data.sortOrder,
        restaurantId: restaurantId
      };
      
      // Only include imageUrl if it's not empty
      if (data.imageUrl && data.imageUrl.trim()) {
        createData.imageUrl = data.imageUrl.trim();
      }
      
      await createCategory(createData);
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

  const handleUpdateCategory = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    
    try {
      setCategoryLoading(true);
      const updateData: any = {
        name: data.name,
        description: data.description
      };
      
      // Only include displayOrder if it actually changed
      if (data.sortOrder !== editingCategory.displayOrder) {
        updateData.displayOrder = data.sortOrder;
      }
      
      // Only include imageUrl if it's not empty
      if (data.imageUrl && data.imageUrl.trim()) {
        updateData.imageUrl = data.imageUrl.trim();
      }
      
      await updateCategory(editingCategory.id, updateData);
      setEditingCategory(null);
      // Refresh menu to update categories in CategoryFilter
      await fetchMenu();
    } catch (error) {
      console.error('Failed to update category:', error);
      // Error handling could be improved with toast notifications
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryDropdown(null);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-gray-700 font-medium">{t.menu.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl border border-red-200/50 p-12 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium mb-4">{t.menu.error}: {error}</p>
            <Button 
              onClick={fetchMenu} 
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t.menu.retry}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show ModifierGroupsPage if requested
  if (showModifierGroups) {
    return (
      <ModifierGroupsPage 
        restaurantId={restaurantId}
        onClose={() => setShowModifierGroups(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="bg-gradient-to-br from-white/70 via-green-50/60 to-emerald-50/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                {t.menu.menuManagement}
              </h1>
              <p className="text-gray-600 text-sm">Manage your restaurant's menu items and categories</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button 
                variant="outline"
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-white/50 backdrop-blur-sm hover:bg-white/80 border-gray-200/50 text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                {t.menu.addCategory}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowModifierGroups(true)}
                className="bg-white/50 backdrop-blur-sm hover:bg-white/80 border-gray-200/50 text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Modifier Groups
              </Button>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.menu.addMenuItem}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                restaurantId={restaurantId}
              />
            </div>
            
            {/* Show Hidden Items Toggle */}
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showHiddenItems}
                  onChange={(e) => setShowHiddenItems(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
                  showHiddenItems 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800' 
                    : 'bg-gray-300'
                }`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-sm ${
                    showHiddenItems ? 'translate-x-6 shadow-lg' : 'translate-x-1'
                  }`} />
                </div>
                <span className="text-sm font-medium text-gray-700 flex items-center group-hover:text-gray-900 transition-colors">
                  {showHiddenItems ? (
                    <>
                      <Eye className="w-4 h-4 mr-2 text-blue-600" />
                      {t.menu.showHidden}
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2 text-gray-500" />
                      {t.menu.hideUnavailable}
                    </>
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {filteredMenu.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🍽️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.menu.noMenuItemsFound}</h3>
            <p className="text-gray-600 mb-6">{t.menu.startByAddingFirstItem}</p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.menu.addMenuItem}
            </Button>
          </div>
        ) : selectedCategory === "all" ? (
          // Display grouped items with category headers
          <ErrorBoundary 
            level="section" 
            name="MenuCategoryGroups"
          >
            <div className="space-y-8">
              {groupedMenu.map(({ category, items }, index) => (
                <ErrorBoundary 
                  key={category.id}
                  level="component" 
                  name={`MenuCategory-${category.name}`}
                >
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    {/* Category Header */}
                    <div className="p-6 border-b border-gray-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                              {category.name}
                            </h2>
                          </div>
                          {category.description && (
                            <p className="text-gray-600 mt-2 ml-6">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setCategoryDropdown(categoryDropdown === category.id ? null : category.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {categoryDropdown === category.id && (
                              <div 
                                className="category-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCategory(category);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  {t.common.edit} Category
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Items Grid */}
                    <div className="p-6">
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
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6">
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
          </div>
        )}
      </div>

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

      {/* Edit Category Modal */}
      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title={t.menu.editCategory}
      >
        {editingCategory && (
          <CategoryForm
            initialData={{
              name: editingCategory.name,
              description: editingCategory.description || '',
              imageUrl: editingCategory.imageUrl || '',
              sortOrder: editingCategory.displayOrder || 1
            }}
            onSubmit={handleUpdateCategory}
            onCancel={() => setEditingCategory(null)}
            isLoading={categoryLoading}
            allCategories={categories}
            currentCategoryId={editingCategory.id}
          />
        )}
      </Modal>
    </div>
  );
}
