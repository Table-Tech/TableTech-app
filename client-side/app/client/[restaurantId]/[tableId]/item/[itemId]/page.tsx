"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IoArrowBack } from "react-icons/io5";
import { HiPlus, HiMinus } from "react-icons/hi";

interface ModifierTemplate {
  id: string;
  template: {
    id: string;
    name: string;
    type: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  };
  required: boolean;
  minSelect: number;
  maxSelect: number | null;
  displayName?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  modifierTemplates: ModifierTemplate[];
}

export default function MenuItemPage() {
  const router = useRouter();
  const { restaurantId, tableId, itemId } = useParams() as {
    restaurantId: string;
    tableId: string;
    itemId: string;
  };

  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Client-side hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch menu item details
  useEffect(() => {
    if (!restaurantId || !tableId || !itemId || !isClient) return;

    const fetchMenuItem = async () => {
      try {
        setLoading(true);
        const tableCode = localStorage.getItem("tableCode") || tableId;
        
        const menuRes = await fetch(
          `http://localhost:3001/api/menu/customer/${tableCode}/${restaurantId}`
        );
        
        if (!menuRes.ok) {
          throw new Error('Failed to fetch menu');
        }
        
        const menuData = await menuRes.json();
        
        if (!menuData.success) {
          throw new Error(menuData.error?.message || 'Failed to fetch menu');
        }

        let foundItem: MenuItem | null = null;
        for (const category of menuData.data.menu) {
          const item = category.menuItems.find((item: any) => item.id === itemId);
          if (item) {
            foundItem = item;
            break;
          }
        }

        if (!foundItem) {
          throw new Error('Menu item not found');
        }

        setMenuItem(foundItem);
      } catch (err) {
        console.error('Error fetching menu item:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu item');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItem();
  }, [restaurantId, tableId, itemId, isClient]);

  // Handle modifier selection
  const handleModifierChange = (templateId: string, optionId: string, isChecked: boolean, isRadio: boolean = false) => {
    setSelectedModifiers(prev => {
      const current = prev[templateId] || [];
      
      if (isRadio) {
        return { ...prev, [templateId]: [optionId] };
      } else {
        if (isChecked) {
          return { ...prev, [templateId]: [...current, optionId] };
        } else {
          return { ...prev, [templateId]: current.filter(id => id !== optionId) };
        }
      }
    });
  };

  // Calculate total price including modifiers
  const calculateTotalPrice = () => {
    if (!menuItem) return 0;
    
    let total = menuItem.price;
    
    Object.entries(selectedModifiers).forEach(([templateId, optionIds]) => {
      const template = menuItem.modifierTemplates.find(mt => mt.id === templateId);
      if (template) {
        optionIds.forEach(optionId => {
          const option = template.template.options.find(opt => opt.id === optionId);
          if (option) {
            total += option.price;
          }
        });
      }
    });
    
    return total * quantity;
  };

  // Add to cart with modifiers
  const handleAddToCart = async () => {
    if (!menuItem || !isClient || addingToCart) return;

    setAddingToCart(true);

    try {
      const modifierIds: string[] = [];
      const modifierNames: string[] = [];
      
      Object.entries(selectedModifiers).forEach(([templateId, optionIds]) => {
        const template = menuItem.modifierTemplates.find(mt => mt.id === templateId);
        if (template) {
          optionIds.forEach(optionId => {
            const option = template.template.options.find(opt => opt.id === optionId);
            if (option) {
              modifierIds.push(optionId);
              modifierNames.push(option.name);
            }
          });
        }
      });

      const cartItem = {
        cartItemId: `${menuItem.id}-${Date.now()}-${Math.random()}`, // Unique cart item ID
        id: menuItem.id, // Menu item ID for API calls
        name: menuItem.name,
        price: calculateTotalPrice() / quantity, // Price per item
        imageUrl: menuItem.imageUrl,
        quantity: quantity,
        modifiers: modifierIds, // Keep IDs for API calls
        modifierNames: modifierNames // Add names for display
      };

      const existingCart = localStorage.getItem("cart");
      const cart = existingCart ? JSON.parse(existingCart) : [];
      cart.push(cartItem);
      localStorage.setItem("cart", JSON.stringify(cart));
      
      // Quick success feedback
      await new Promise(resolve => setTimeout(resolve, 200));
      
      router.push(`/client/${restaurantId}/${tableId}`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAddingToCart(false);
    }
  };

  const handleBack = () => {
    router.push(`/client/${restaurantId}/${tableId}`);
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-64 bg-gray-200"></div>
      <div className="p-4 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );

  if (!isClient || loading) {
    return <LoadingSkeleton />;
  }

  if (error || !menuItem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oeps!</h2>
          <p className="text-gray-600 mb-6">{error || 'Menu item niet gevonden'}</p>
          <button
            onClick={handleBack}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Terug naar menu
          </button>
        </div>
      </div>
    );
  }

  const totalPrice = calculateTotalPrice();
  const basePrice = menuItem.price;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors active:scale-95"
          >
            <IoArrowBack size={18} className="text-gray-700" />
          </button>
          
          <div className="text-center">
            <h1 className="font-bold text-gray-800 truncate max-w-48">{menuItem.name}</h1>
            <p className="text-sm text-gray-500">€{basePrice.toFixed(2).replace('.', ',')}</p>
          </div>
          
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
        {menuItem.imageUrl ? (
          <img
            src={menuItem.imageUrl}
            alt={menuItem.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-8xl opacity-30">🍽️</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto bg-white -mt-6 relative z-10 rounded-t-3xl shadow-lg">
        <div className="p-6">
          {/* Title Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {menuItem.name}
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-green-600">
                €{basePrice.toFixed(2).replace('.', ',')}
              </p>
              {totalPrice !== basePrice && (
                <p className="text-sm text-gray-500">
                  Totaal: €{totalPrice.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>
            {menuItem.description && (
              <p className="text-gray-600 mt-3 leading-relaxed">
                {menuItem.description}
              </p>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Aantal</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1 max-w-40">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={quantity <= 1}
              >
                <HiMinus size={16} className="text-gray-600" />
              </button>
              <span className="text-lg font-semibold text-gray-800 px-4">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
              >
                <HiPlus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Modifiers */}
          {menuItem.modifierTemplates.map((modifierTemplate, index) => {
            const template = modifierTemplate.template;
            const isRadio = template.type === 'SINGLE_CHOICE' || modifierTemplate.maxSelect === 1;
            const displayName = modifierTemplate.displayName || template.name;
            const maxSelect = modifierTemplate.maxSelect;
            
            return (
              <div key={modifierTemplate.id} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    {displayName}
                    {modifierTemplate.required && (
                      <span className="text-red-500 text-sm ml-1">*</span>
                    )}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {isRadio ? 'Kies 1' : `Max ${maxSelect || template.options.length}`}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {template.options.map((option) => {
                    const isSelected = selectedModifiers[modifierTemplate.id]?.includes(option.id) || false;
                    
                    return (
                      <label
                        key={option.id}
                        className={`
                          flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">{option.name}</span>
                          {option.price > 0 && (
                            <span className="block text-sm text-green-600 font-medium">
                              +€{option.price.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {isRadio ? (
                            <div className={`
                              w-5 h-5 rounded-full border-2 transition-colors
                              ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}
                            `}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                              )}
                            </div>
                          ) : (
                            <div className={`
                              w-5 h-5 rounded border-2 transition-colors flex items-center justify-center
                              ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}
                            `}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <input
                          type={isRadio ? "radio" : "checkbox"}
                          name={isRadio ? `modifier-${modifierTemplate.id}` : undefined}
                          checked={isSelected}
                          onChange={(e) => handleModifierChange(modifierTemplate.id, option.id, e.target.checked, isRadio)}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={handleAddToCart}
            disabled={addingToCart}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all
              ${addingToCart 
                ? 'bg-gray-400 text-white' 
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/25'
              }
            `}
          >
            {addingToCart ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Toevoegen...
              </div>
            ) : (
              `Toevoegen ${quantity > 1 ? `(${quantity}x)` : ''} • €${totalPrice.toFixed(2).replace('.', ',')}`
            )}
          </motion.button>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-24"></div>
    </div>
  );
}