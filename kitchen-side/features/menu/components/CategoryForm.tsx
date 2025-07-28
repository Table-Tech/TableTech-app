/**
 * Category Form Component
 * Form for creating and editing menu categories
 */

"use client";

import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: CategoryFormData;
  isLoading?: boolean;
}

export interface CategoryFormData {
  name: string;
  description: string;
  sortOrder: number;
}

export function CategoryForm({ onSubmit, onCancel, initialData, isLoading }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    sortOrder: initialData?.sortOrder || 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
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
          Category Name
        </label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Burgers, Pizza, Drinks"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <Input
          type="text"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Brief description of this category"
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort Order
        </label>
        <Input
          type="number"
          value={formData.sortOrder}
          onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 1)}
          min={1}
          placeholder="1"
        />
        <p className="text-gray-500 text-xs mt-1">
          Lower numbers appear first in the menu
        </p>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : (initialData ? 'Update Category' : 'Create Category')}
        </Button>
      </div>
    </form>
  );
}