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
}

export interface CategoryFormData {
  name: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
}

export function CategoryForm({ onSubmit, onCancel, initialData, isLoading }: CategoryFormProps) {
  const t = useTranslation();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    imageUrl: initialData?.imageUrl || '',
    sortOrder: initialData?.sortOrder || 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
            onClick={() => handleChange('sortOrder', Math.max(1, formData.sortOrder - 1))}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
            disabled={formData.sortOrder <= 1}
          >
            ↑
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
            Position {formData.sortOrder}
          </span>
          <button
            type="button"
            onClick={() => handleChange('sortOrder', formData.sortOrder + 1)}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
          >
            ↓
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-1">
          Use arrows to change position (lower numbers appear first)
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