"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientPage() {
    const router = useRouter();
    const { restaurantId, tableId } = useParams() as {
        restaurantId: string;
        tableId: string;
    };

    const [restaurantName, setRestaurantName] = useState<string | null>(null);
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [showPopup, setShowPopup] = useState(false);
    const [menuData, setMenuData] = useState<Record<string, any[]> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [startTransition, setStartTransition] = useState(false);
    const [startEntryTransition, setStartEntryTransition] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

    // Client-side hydration fix
    useEffect(() => {
        setIsClient(true);
        
        // Only access localStorage after client-side hydration
        const stored = localStorage.getItem("cart");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const filtered = parsed.filter((item: any) => item.quantity >= 1);
                setCart(filtered);
                localStorage.setItem("cart", JSON.stringify(filtered));
            } catch (error) {
                console.error('Error parsing cart from localStorage:', error);
                localStorage.removeItem("cart");
            }
        }

        const timeout = setTimeout(() => setStartEntryTransition(false), 600);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!restaurantId || !tableId || !isClient) return;

        const fetchMenu = async () => {
            try {
                const tableCode = localStorage.getItem("tableCode") || tableId;
                const menuRes = await fetch(
                    `http://localhost:3001/api/menu/customer/${tableCode}/${restaurantId}`
                );
                const menuRaw = await menuRes.json();

                const restaurantName = menuRaw?.data?.restaurant?.name || "Restaurant Menu";
                setRestaurantName(restaurantName);

                const tableNumber = menuRaw?.data?.table?.number;
                setTableNumber(tableNumber);

                const categories = menuRaw?.data?.menu || [];
                const grouped: Record<string, any[]> = {};

                categories.forEach((category: any) => {
                    const catName = category.name || "Overig";
                    if (Array.isArray(category.menuItems)) {
                        grouped[catName] = category.menuItems;
                    }
                });

                setMenuData(grouped);
            } catch (err) {
                setError("Kan menu niet laden.");
            }
        };

        fetchMenu();
    }, [restaurantId, tableId, isClient]);

    const handleAddToCart = (item: any) => {
        if (!isClient) return; // Prevent updates before hydration
        
        const existing = cart.find((i) => i.id === item.id);
        const newCart = existing
            ? cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            )
            : [...cart, { ...item, quantity: 1 }];
        setCart(newCart);
        
        try {
            localStorage.setItem("cart", JSON.stringify(newCart));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    };

    const handleGoToCart = () => {
        setStartTransition(true);
        setTimeout(() => {
            router.push(`/client/${restaurantId}/${tableId}/cart`);
        }, 400);
    };

    const handleCategoryClick = (category: string) => {
        const el = categoryRefs.current[category];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    if (!restaurantId || !tableId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-600">Geen geldige link. Scan opnieuw.</p>
            </div>
        );
    }

    // Show loading until client-side hydration is complete
    if (!isClient) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-700">Laden...</p>
                </div>
            </div>
        );
    }

    const categories = menuData ? Object.keys(menuData) : [];

    return (
        <>
            {!startEntryTransition && (
                <motion.div
                    initial={{ y: "-100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="min-h-screen bg-gray-50"
                >
                    <div className="bg-white px-4 py-6">
                        <div className="max-w-sm mx-auto text-center">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">TableTech</h1>
                            <p className="text-gray-600">
                                Tafel {tableNumber || tableId} • {restaurantName}
                            </p>
                        </div>
                    </div>

                    <div className="fixed top-5 right-5 z-50">
                        <button
                            onClick={() => setShowPopup(true)}
                            className="bg-white text-black p-3 rounded-full shadow-lg border"
                        >
                            🧍
                        </button>
                    </div>

                    {showPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
                            <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-sm">
                                <h2 className="text-lg font-bold mb-4">Maak een keuze</h2>
                                <button
                                    onClick={() => {
                                        setShowPopup(false);
                                        alert("🧾 De rekening is aangevraagd.");
                                    }}
                                    className="w-full bg-purple-700 text-white py-3 rounded mb-3"
                                >
                                    🧾 Vraag de rekening
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPopup(false);
                                        alert("🙋 Een ober is onderweg.");
                                    }}
                                    className="w-full bg-gray-800 text-white py-3 rounded mb-3"
                                >
                                    🙋 Vraag om een ober
                                </button>
                                <button
                                    onClick={() => setShowPopup(false)}
                                    className="w-full text-gray-600 underline"
                                >
                                    Sluiten
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-30">
                        <div className="max-w-sm mx-auto">
                            <div className="flex flex-wrap gap-2 justify-center">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => handleCategoryClick(category)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-6 pb-32">
                        <div className="max-w-sm mx-auto">
                            {error && (
                                <p className="text-red-600 text-center text-sm mb-4">{error}</p>
                            )}

                            {categories.map((category) => (
                                <div
                                    key={category}
                                    ref={(el) => {
                                        categoryRefs.current[category] = el;
                                    }}
                                    className="mb-8 scroll-mt-24"
                                >
                                    <h2 className="text-xl font-bold text-gray-800 mb-4">{category}</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {menuData![category].map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
                                            >
                                                <div className="aspect-[4/3] w-full bg-gray-100">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-3xl text-gray-300">🍽️</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="font-semibold text-gray-800 mb-1 text-xs">
                                                        {item.name}
                                                    </h3>
                                                    {item.description && (
                                                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-gray-800">
                                                            €{Number(item.price).toFixed(2).replace('.', ',')}
                                                        </span>
                                                        <button
                                                            onClick={() => handleAddToCart(item)}
                                                            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="w-3 h-3 text-white"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth={3}
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {cart.length > 0 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
                            className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 px-4 py-4"
                        >
                            <div className="max-w-sm mx-auto">
                                <button
                                    onClick={handleGoToCart}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg"
                                >
                                    🛍️ Bekijk bestelling ({totalItems} items – €{total.toFixed(2).replace('.', ',')})
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {startTransition && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-50 bg-white"
                >
                    <div className="h-full flex items-center justify-center">
                        <p className="text-xl font-bold animate-pulse">Laden...</p>
                    </div>
                </motion.div>
            )}
        </>
    );
}
