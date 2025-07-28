/**
 * Menu Form Component
 * Form for creating and editing menu items
 */

"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { MenuItem } from '@/shared/types';
import { useCategories } from '../hooks/useCategories';

interface MenuFormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface MenuFormProps {
  initialData?: MenuItem;
  onSubmit: (data: MenuFormData) => Promise<void>;
  onCancel: () => void;
  restaurantId: string;
}

export function MenuForm({ initialData, onSubmit, onCancel, restaurantId }: MenuFormProps) {
  const { categories, fetchCategories } = useCategories(restaurantId);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<MenuFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    categoryId: initialData?.categoryId || '',
    imageUrl: initialData?.imageUrl || '',
    isAvailable: initialData?.available ?? true,
  });

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Add restaurantId to the form data and handle empty imageUrl
      const submitData = {
        ...formData,
        restaurantId: restaurantId,
        imageUrl: formData.imageUrl?.trim() || undefined // Convert empty string to undefined
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof MenuFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Menu item name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe the menu item"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price * ($)
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          value={formData.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image URL
        </label>
        <Input
          type="url"
          value={formData.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="available"
          checked={formData.isAvailable}
          onChange={(e) => handleChange('isAvailable', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="available" className="ml-2 block text-sm text-gray-700">
          Available for ordering
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : initialData ? 'Update Item' : 'Create Item'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}