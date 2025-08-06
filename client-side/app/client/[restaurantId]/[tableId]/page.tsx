"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineUser, HiOutlineReceiptTax, HiPlus } from "react-icons/hi";
import { IoSearchOutline } from "react-icons/io5";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [addAnimations, setAddAnimations] = useState<Record<string, boolean>>({});
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

        const timeout = setTimeout(() => setStartEntryTransition(false), 300);
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

    const handleAddToCart = (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isClient) return;
        
        // Trigger add animation
        setAddAnimations(prev => ({ ...prev, [item.id]: true }));
        
        // Reset animation after it completes
        setTimeout(() => {
            setAddAnimations(prev => ({ ...prev, [item.id]: false }));
        }, 1000);
        
        const existing = cart.find((i) => i.id === item.id);
        const newCart = existing
            ? cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            )
            : [...cart, { 
                cartItemId: `${item.id}-${Date.now()}-${Math.random()}`,
                ...item, 
                quantity: 1, 
                modifiers: [], 
                modifierNames: [] 
              }];
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
        setActiveCategory(category);
        const el = categoryRefs.current[category];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Filter items based on search query
    const filterItems = (items: any[]) => {
        if (!searchQuery.trim()) return items;
        return items.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    if (!restaurantId || !tableId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full">
                    <div className="text-6xl mb-4">😔</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Oeps!</h2>
                    <p className="text-gray-600">Geen geldige link. Scan opnieuw.</p>
                </div>
            </div>
        );
    }

    // Show loading until client-side hydration is complete
    if (!isClient || !menuData) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="animate-pulse">
                    {/* Header skeleton */}
                    <div className="bg-white px-4 py-6">
                        <div className="max-w-md mx-auto text-center">
                            <div className="h-8 bg-gray-200 rounded-lg mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                        </div>
                    </div>
                    
                    {/* Search skeleton */}
                    <div className="px-4 py-4">
                        <div className="max-w-md mx-auto">
                            <div className="h-12 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>
                    
                    {/* Categories skeleton */}
                    <div className="px-4 pb-4">
                        <div className="max-w-md mx-auto flex gap-2">
                            <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                            <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                    
                    {/* Menu items skeleton */}
                    <div className="px-4">
                        <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                    <div className="aspect-[4/3] bg-gray-200"></div>
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const categories = menuData ? Object.keys(menuData) : [];
    const hasSearchResults = searchQuery && categories.some(cat => filterItems(menuData![cat]).length > 0);

    return (
        <>
            {!startEntryTransition && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-screen bg-gray-50"
                >
                    {/* Header */}
                    <div className="bg-white px-4 py-6 shadow-sm">
                        <div className="max-w-md mx-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-center flex-1">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                        {restaurantName || 'TableTech'}
                                    </h1>
                                    <p className="text-sm text-gray-600">
                                        Tafel {tableNumber || tableId}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPopup(true)}
                                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                                >
                                    <HiOutlineUser size={20} className="text-gray-700" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Service popup */}
                    <AnimatePresence>
                        {showPopup && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
                                >
                                    <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Service</h2>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                setShowPopup(false);
                                                alert("🧾 De rekening is aangevraagd.");
                                            }}
                                            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <HiOutlineReceiptTax size={20} />
                                            Vraag de rekening
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowPopup(false);
                                                alert("🙋 Een ober is onderweg.");
                                            }}
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <HiOutlineUser size={20} />
                                            Vraag om hulp
                                        </button>
                                        <button
                                            onClick={() => setShowPopup(false)}
                                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-colors"
                                        >
                                            Sluiten
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Search Bar */}
                    <div className="px-4 py-4 bg-white border-b border-gray-100">
                        <div className="max-w-md mx-auto">
                            <div className="relative">
                                <IoSearchOutline size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Zoek gerechten..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    {!searchQuery && (
                        <div className="px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
                            <div className="max-w-md mx-auto">
                                <div className="flex overflow-x-auto gap-2 scrollbar-hide">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => handleCategoryClick(category)}
                                            className={`
                                                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                                                ${activeCategory === category 
                                                    ? 'bg-green-500 text-white shadow-sm' 
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }
                                            `}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="px-4 py-6 pb-32">
                        <div className="max-w-md mx-auto">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                                    <p className="text-red-700 text-center">{error}</p>
                                </div>
                            )}

                            {searchQuery && !hasSearchResults && (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Geen resultaten</h3>
                                    <p className="text-gray-600">Probeer een andere zoekterm</p>
                                </div>
                            )}

                            {categories.map((category) => {
                                const filteredItems = filterItems(menuData![category]);
                                if (searchQuery && filteredItems.length === 0) return null;

                                return (
                                    <div
                                        key={category}
                                        ref={(el) => {
                                            categoryRefs.current[category] = el;
                                        }}
                                        className="mb-8 scroll-mt-32"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl font-bold text-gray-900">{category}</h2>
                                            <span className="text-sm text-gray-500">{filteredItems.length} items</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            {filteredItems.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => router.push(`/client/${restaurantId}/${tableId}/item/${item.id}`)}
                                                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100"
                                                >
                                                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover transition-transform hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <span className="text-4xl opacity-30">🍽️</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="p-4">
                                                        <h3 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-1">
                                                            {item.name}
                                                        </h3>
                                                        {item.description && (
                                                            <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold text-green-600">
                                                                €{Number(item.price).toFixed(2).replace('.', ',')}
                                                            </span>
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => handleAddToCart(item, e)}
                                                                    className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95"
                                                                >
                                                                    <HiPlus size={16} className="text-white" />
                                                                </button>
                                                                
                                                                {/* Add to Cart Animation */}
                                                                <AnimatePresence>
                                                                    {addAnimations[item.id] && (
                                                                        <motion.div
                                                                            initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                                                            animate={{ 
                                                                                opacity: 0, 
                                                                                y: -30, 
                                                                                scale: 1.2,
                                                                                x: [0, 3, -3, 0] // Small wiggle effect
                                                                            }}
                                                                            exit={{ opacity: 0 }}
                                                                            transition={{ 
                                                                                duration: 0.8, 
                                                                                ease: "easeOut",
                                                                                x: { duration: 0.2, repeat: 2 }
                                                                            }}
                                                                            className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
                                                                        >
                                                                            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                                                                                +1
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cart Button */}
                    <AnimatePresence>
                        {cart.length > 0 && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed bottom-4 left-4 right-4 z-40"
                            >
                                <div className="max-w-md mx-auto">
                                    <button
                                        onClick={handleGoToCart}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-between px-6"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-bold">{totalItems}</span>
                                            </div>
                                            <span>Bekijk bestelling</span>
                                        </div>
                                        <span>€{total.toFixed(2).replace('.', ',')}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {startTransition && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-50 bg-white flex items-center justify-center"
                >
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-semibold text-gray-800">Laden...</p>
                    </div>
                </motion.div>
            )}
        </>
    );
}
