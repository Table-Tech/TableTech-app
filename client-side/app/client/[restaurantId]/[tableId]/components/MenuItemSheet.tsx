"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { IoClose } from "react-icons/io5";
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
  modifierTemplates?: ModifierTemplate[];
}

interface MenuItemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  onAddToCart: (cartItem: any) => void;
  restaurantId: string;
  tableId: string;
}

export default function MenuItemSheet({
  isOpen,
  onClose,
  item,
  onAddToCart,
  restaurantId,
  tableId,
}: MenuItemSheetProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuItemWithModifiers, setMenuItemWithModifiers] = useState<MenuItem | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Drag functionality
  const y = useMotionValue(0);

  // Handle drag end
  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (offset > 150 || velocity > 500) {
      onClose();
    } else {
      y.set(0);
    }
  };

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setSelectedModifiers({});
      setQuantity(1);
      setAddingToCart(false);
      setAnimationComplete(false);
      y.set(0); // Reset drag position
      
      // Fetch full item details with modifiers if needed
      if (!item.modifierTemplates) {
        fetchFullItemDetails();
      } else {
        setMenuItemWithModifiers(item);
      }
    }
  }, [item, y]);

  // Reset y value when sheet opens
  useEffect(() => {
    if (isOpen) {
      setAnimationComplete(false);
      // Force reset the y value immediately when opening
      y.set(0);
    } else {
      // Also reset when closing to ensure clean state
      y.set(0);
      setAnimationComplete(false);
    }
  }, [isOpen, y]);

  const fetchFullItemDetails = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
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
        const menuItem = category.menuItems.find((i: any) => i.id === item.id);
        if (menuItem) {
          foundItem = menuItem;
          break;
        }
      }

      if (foundItem) {
        setMenuItemWithModifiers(foundItem);
      }
    } catch (err) {
      console.error('Error fetching menu item details:', err);
    } finally {
      setLoading(false);
    }
  };

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
    if (!menuItemWithModifiers) return 0;
    
    let total = menuItemWithModifiers.price;
    
    if (menuItemWithModifiers.modifierTemplates) {
      Object.entries(selectedModifiers).forEach(([templateId, optionIds]) => {
        const template = menuItemWithModifiers.modifierTemplates?.find(mt => mt.id === templateId);
        if (template) {
          optionIds.forEach(optionId => {
            const option = template.template.options.find(opt => opt.id === optionId);
            if (option) {
              total += option.price;
            }
          });
        }
      });
    }
    
    return total * quantity;
  };

  // Add to cart with modifiers
  const handleAddToCart = async () => {
    if (!menuItemWithModifiers || addingToCart) return;

    setAddingToCart(true);

    try {
      const modifierIds: string[] = [];
      const modifierNames: string[] = [];
      
      if (menuItemWithModifiers.modifierTemplates) {
        Object.entries(selectedModifiers).forEach(([templateId, optionIds]) => {
          const template = menuItemWithModifiers.modifierTemplates?.find(mt => mt.id === templateId);
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
      }

      const cartItem = {
        cartItemId: `${menuItemWithModifiers.id}-${Date.now()}-${Math.random()}`,
        id: menuItemWithModifiers.id,
        name: menuItemWithModifiers.name,
        price: calculateTotalPrice() / quantity,
        imageUrl: menuItemWithModifiers.imageUrl,
        quantity: quantity,
        modifiers: modifierIds,
        modifierNames: modifierNames
      };

      onAddToCart(cartItem);
      
      // Quick success feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  if (!item) return null;

  const displayItem = menuItemWithModifiers || item;
  const totalPrice = calculateTotalPrice();
  const basePrice = displayItem.price;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />

          {/* Sheet */}
          <motion.div
            key={`sheet-${item?.id}-${isOpen}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            style={animationComplete ? { y } : {}}
            drag={animationComplete ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            onDragEnd={handleDragEnd}
            onAnimationComplete={() => setAnimationComplete(true)}
            transition={{
              duration: 0.3,
              ease: "easeOut"
            }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl max-h-[90vh] overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Drag Indicator */}
            <div className="sticky top-0 z-10 bg-white pt-2 pb-4">
              <div className="w-12 h-1.5 bg-gray-400 rounded-full mx-auto mb-4 hover:bg-gray-500 transition-colors" />
              
              {/* Header */}
              <div className="flex items-center justify-between px-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
                    {displayItem.name}
                  </h2>
                  <p className="text-lg font-semibold text-green-600">
                    €{basePrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors active:scale-95"
                >
                  <IoClose size={20} className="text-gray-700" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] pb-24">
              {/* Image */}
              {displayItem.imageUrl && (
                <div className="px-4 mb-4">
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={displayItem.imageUrl}
                      alt={displayItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="px-4">
                {/* Description */}
                {displayItem.description && (
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {displayItem.description}
                  </p>
                )}

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

                {/* Loading state for modifiers */}
                {loading && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Modifiers */}
                {!loading && menuItemWithModifiers?.modifierTemplates?.map((modifierTemplate) => {
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
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
              <motion.button
                onClick={handleAddToCart}
                disabled={addingToCart || loading}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all
                  ${addingToCart || loading
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}