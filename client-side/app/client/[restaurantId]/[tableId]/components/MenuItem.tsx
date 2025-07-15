"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItemType {
    id: number;
    name: string;
    price: number;
    description?: string;
    image?: string;
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

        // Toon tijdelijke "+x" feedback
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowMessage(true);
        timeoutRef.current = setTimeout(() => setShowMessage(false), 1000);
    };

    return (
        <div className="bg-gray-100 rounded-2xl shadow-md p-4 space-y-3 pb-6">
            <div className="flex gap-4 items-center">
                {item.image && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                            src={item.image}
                            alt={item.name || "Gerecht"}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="flex-1">
                    <h2 className="text-lg font-semibold">{item.name}</h2>
                    {item.description && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    <p className="text-base font-bold mt-1">€ {Number(item.price).toFixed(2)}</p>

                </div>
            </div>

            <div className="flex items-center justify-between relative -mt-4">
                {/* Aantal invoer */}
                <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setQuantity(isNaN(val) || val < 1 ? 1 : val);
                    }}
                    className="w-16 border rounded px-2 py-1 text-center bg-white"
                />

                {/* Animatie: "+X" */}
                <div className="absolute left-[85%] transform -translate-x-1/2 top-7">
                    <AnimatePresence>
                        {showMessage && (
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                className="bg-black text-white text-sm px-6 py-1 rounded-xl shadow"
                            >
                                +{quantity}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Toevoegen knop */}
                <motion.button
                    onClick={handleAddClick}
                    disabled={showMessage}
                    className={`relative px-4 py-2 rounded-xl overflow-hidden transition ${showMessage
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-black hover:bg-gray-800"
                        }`}
                >
                    <div className="relative h-5 overflow-hidden z-10">
                        <motion.span
                            animate={{ y: showMessage ? "100%" : "0%" }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="block text-white text-sm font-medium"
                        >
                            Voeg toe
                        </motion.span>
                    </div>
                    <motion.div
                        animate={{ y: showMessage ? "0%" : "-100%" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="absolute inset-0 bg-black z-0"
                    />
                </motion.button>
            </div>
        </div>
    );
}
