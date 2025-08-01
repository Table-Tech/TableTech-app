"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItemType {
    id: number;
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
}

export default function MenuItem({
    item,
    onAdd,
}: {
    item: MenuItemType;
    onAdd: (item: MenuItemType, quantity: number) => void;
}) {
    const [quantity, setQuantity] = useState<number>(1);
    const [showMessage, setShowMessage] = useState<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleAddClick = () => {
        if (quantity < 1) return;

        onAdd(item, quantity);

        // Toon tijdelijke feedback
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowMessage(true);
        timeoutRef.current = setTimeout(() => setShowMessage(false), 1000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 h-full flex flex-col">
            {/* Product Image */}
            <div className="aspect-square w-full bg-gray-100 overflow-hidden">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name || "Product"}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl text-gray-300">🍽️</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                    <h3 className="font-bold text-gray-800 mb-1 text-sm leading-tight">
                        {item.name}
                    </h3>
                    {item.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Price and Add Button */}
                <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-gray-800">
                        €{Number(item.price).toFixed(2)}
                    </span>
                    
                    <div className="relative">
                        {/* Add Button */}
                        <motion.button
                            onClick={handleAddClick}
                            disabled={showMessage}
                            whileTap={{ scale: 0.95 }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                showMessage
                                    ? "bg-green-500"
                                    : "bg-blue-500 hover:bg-blue-600"
                            }`}
                        >
                            <motion.span
                                animate={{ 
                                    rotate: showMessage ? 360 : 0,
                                    scale: showMessage ? [1, 1.2, 1] : 1
                                }}
                                transition={{ 
                                    duration: showMessage ? 0.6 : 0,
                                    ease: "easeInOut"
                                }}
                                className="text-white text-lg font-bold"
                            >
                                {showMessage ? "✓" : "+"}
                            </motion.span>
                        </motion.button>

                        {/* Success Animation */}
                        <AnimatePresence>
                            {showMessage && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                                >
                                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                                        +{quantity}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}