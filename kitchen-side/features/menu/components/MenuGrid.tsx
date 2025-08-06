/**
 * Menu Grid Component
 * Displays menu items in a responsive grid layout
 */

"use client";

import { MenuItem } from '@/shared/types';
import { Button } from '@/shared/components/ui/Button';
import { useTranslation } from '@/shared/contexts/LanguageContext';
import { Edit, Eye, EyeOff, DollarSign } from 'lucide-react';

interface MenuGridProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
  showHiddenItems?: boolean;
}

export function MenuGrid({ items, onEdit, onToggleAvailability, showHiddenItems = false }: MenuGridProps) {
  const t = useTranslation();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => {
        const isHidden = !item.available;
        const containerClasses = `bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all ${
          isHidden && showHiddenItems 
            ? 'opacity-60 border-2 border-dashed border-gray-300' 
            : ''
        }`;
        
        return (
        <div key={item.id} className={containerClasses}>
          {/* Image */}
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-4xl">🍽️</span>
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg text-gray-800 truncate">
                {item.name}
              </h3>
              <div className="flex items-center text-green-600 font-medium">
                <DollarSign className="w-4 h-4" />
                {parseFloat(item.price.toString()).toFixed(2)}
              </div>
            </div>

            {item.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Category */}
            {item.category && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-3">
                {item.category.name}
              </span>
            )}

            {/* Availability */}
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs px-2 py-1 rounded-full ${
                item.available 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {item.available ? t.menu.available : t.menu.hidden}
              </span>
              {isHidden && showHiddenItems && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  {t.menu.notVisibleToCustomers}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                {t.menu.edit}
              </Button>
              <Button
                variant={item.available ? "outline" : "success"}
                size="sm"
                onClick={() => onToggleAvailability(item.id, !item.available)}
                className={`flex-1 ${
                  item.available 
                    ? 'text-red-600 border-red-300 hover:bg-red-50' 
                    : ''
                }`}
              >
                {item.available ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    {t.menu.hide}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    {t.menu.show}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}