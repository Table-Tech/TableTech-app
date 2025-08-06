/**
 * Category Filter Component
 * Filter menu items by category
 */

"use client";

import { useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useTranslation } from '@/shared/contexts/LanguageContext';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  restaurantId: string;
}

export function CategoryFilter({ selectedCategory, onCategoryChange, restaurantId }: CategoryFilterProps) {
  const t = useTranslation();
  const { categories, fetchCategories } = useCategories(restaurantId);

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{t.menu.filterByCategory}</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t.menu.allItems}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}