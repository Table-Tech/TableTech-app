/**
 * Category Form Component
 * Form for creating and editing menu categories
 */

"use client";

import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useTranslation } from '@/shared/contexts/LanguageContext';

interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: CategoryFormData;
  isLoading?: boolean;
  allCategories?: any[];
  currentCategoryId?: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
}

export function CategoryForm({ onSubmit, onCancel, initialData, isLoading, allCategories, currentCategoryId }: CategoryFormProps) {
  const t = useTranslation();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    imageUrl: initialData?.imageUrl || '',
    sortOrder: initialData?.sortOrder || 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate current position among all categories
  const getCurrentPosition = () => {
    if (!allCategories || !currentCategoryId) return 1;
    
    // Create a copy of categories with the current form's sortOrder
    const categoriesWithUpdate = allCategories.map(cat => 
      cat.id === currentCategoryId 
        ? { ...cat, displayOrder: formData.sortOrder }
        : cat
    );
    
    // Sort categories by displayOrder
    const sortedCategories = categoriesWithUpdate.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const currentIndex = sortedCategories.findIndex(cat => cat.id === currentCategoryId);
    return currentIndex >= 0 ? currentIndex + 1 : 1;
  };

  const currentPosition = getCurrentPosition();
  const totalCategories = allCategories?.length || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = t.menu.categoryNameRequired;
    }
    if (!formData.description.trim()) {
      newErrors.description = t.menu.descriptionRequired;
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit(formData);
        onCancel(); // Close modal on success
      } catch (error) {
        console.error('Error submitting category:', error);
      }
    }
  };

  const handleChange = (field: keyof CategoryFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.menu.categoryName}
        </label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={t.menu.categoryNamePlaceholder}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.menu.description}
        </label>
        <Input
          type="text"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t.menu.briefDescription}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.menu.imageUrl} <span className="text-gray-400">({t.menu.optional})</span>
        </label>
        <Input
          type="url"
          value={formData.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder={t.menu.imageUrlPlaceholder}
        />
        <p className="text-gray-500 text-xs mt-1">
          Optional: Add an image URL for this category
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Position
        </label>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentPosition > 1 && allCategories) {
                // Move up: get the displayOrder of the category above and subtract 1
                const sortedCategories = [...allCategories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                const categoryAbove = sortedCategories[currentPosition - 2];
                if (categoryAbove) {
                  const newOrder = (categoryAbove.displayOrder || 0) - 1;
                  handleChange('sortOrder', newOrder);
                }
              }
            }}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPosition <= 1}
          >
            ↑
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
            Position {currentPosition} of {totalCategories}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentPosition < totalCategories && allCategories) {
                // Move down: get the displayOrder of the category below and add 1
                const sortedCategories = [...allCategories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                const categoryBelow = sortedCategories[currentPosition];
                if (categoryBelow) {
                  const newOrder = (categoryBelow.displayOrder || 0) + 1;
                  handleChange('sortOrder', newOrder);
                }
              }
            }}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPosition >= totalCategories}
          >
            ↓
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-1">
          Use arrows to move category up or down in the menu order
        </p>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {t.common.cancel}
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? t.menu.creating : (initialData ? t.menu.updateCategory : t.menu.createCategory)}
        </Button>
      </div>
    </form>
  );
}