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
import { useTranslation } from '@/shared/contexts/LanguageContext';
import { Settings, Info } from 'lucide-react';
import { ModifiersTab } from './ModifiersTab';

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
  const t = useTranslation();
  const { categories, fetchCategories } = useCategories(restaurantId);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'modifiers'>('basic');
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
      // Only add restaurantId for new items (when creating)
      const submitData = {
        ...formData,
        ...(initialData ? {} : { restaurantId: restaurantId }), // Only add restaurantId when creating new items
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

  const renderBasicInfoTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.menu.name} {t.menu.required}
        </label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={t.menu.menuItemName}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.menu.description}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t.menu.describeMenuItem}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.menu.priceInDollars}
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
          {t.menu.category} {t.menu.required}
        </label>
        <select
          value={formData.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">{t.menu.selectCategory}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.menu.imageUrl}
        </label>
        <Input
          type="url"
          value={formData.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder={t.menu.imageUrlPlaceholder}
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
          {t.menu.availableForOrdering}
        </label>
      </div>
    </div>
  );

  const renderModifiersTab = () => {
    // Only show modifiers tab for existing menu items (with ID)
    if (!initialData?.id) {
      return (
        <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200">
          <Settings className="w-12 h-12 mx-auto mb-4 text-blue-300" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">Save Menu Item First</h3>
          <p className="text-blue-700 text-sm">
            Create the menu item first, then you can add modifier groups and options.
          </p>
        </div>
      );
    }

    return <ModifiersTab menuItemId={initialData.id} restaurantId={restaurantId} />;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Basic Info</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modifiers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'modifiers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Modifiers</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit}>
        {activeTab === 'basic' && renderBasicInfoTab()}
        {activeTab === 'modifiers' && renderModifiersTab()}
        
        {/* Form Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? t.menu.saving : initialData ? t.menu.updateItem : t.menu.createItem}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}