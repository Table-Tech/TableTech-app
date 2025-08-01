"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientPage() {
    const router = useRouter();
    const { restaurantId, tableId } = useParams() as {
        restaurantId: string;
        tableId: string;
    };

    const [restaurantName, setRestaurantName] = useState<string | null>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("Populair");
    const [showPopup, setShowPopup] = useState(false);
    const [menuData, setMenuData] = useState<Record<string, any[]> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

    // Cart uit localStorage ophalen
    useEffect(() => {
        const stored = localStorage.getItem("cart");
        if (stored) {
            const parsed = JSON.parse(stored);
            const filtered = parsed.filter((item: any) => item.quantity >= 1);
            setCart(filtered);
            localStorage.setItem("cart", JSON.stringify(filtered));
        }
    }, []);

    // Menu en restaurant ophalen
    useEffect(() => {
        if (!restaurantId || !tableId) return;

        const fetchMenu = async () => {
            try {
                const tableCode = localStorage.getItem('tableCode') || tableId;
                const menuRes = await fetch(`http://localhost:3001/api/menu/customer/${tableCode}/${restaurantId}`);
                const menuRaw = await menuRes.json();

                const restaurantName = menuRaw?.data?.restaurant?.name || "Restaurant Menu";
                setRestaurantName(restaurantName);

                const categories = menuRaw?.data?.menu || [];
                const grouped: Record<string, any[]> = { "Populair": [] };
                let allItems: any[] = [];
                
                categories.forEach((category: any) => {
                    const catName = category.name || "Overig";
                    if (Array.isArray(category.menuItems)) {
                        grouped[catName] = category.menuItems;
                        allItems = [...allItems, ...category.menuItems];
                    }
                });

                // Eerste 4 items als populair
                grouped["Populair"] = allItems.slice(0, 4);
                setMenuData(grouped);
            } catch (err) {
                setError("Kan menu niet laden.");
            }
        };

        fetchMenu();
    }, [restaurantId, tableId]);

    const handleAddToCart = (item: any) => {
        const existing = cart.find((i) => i.id === item.id);
        const newCart = existing
            ? cart.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
            : [...cart, { ...item, quantity: 1 }];
        setCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
    };

    const handleGoToCart = () => {
        router.push(`/client/${restaurantId}/${tableId}/cart`);
    };

    if (!restaurantId || !tableId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-red-600">Geen geldige link. Scan opnieuw.</p>
            </div>
        );
    }

    const categories = menuData ? Object.keys(menuData) : [];
    const currentItems = menuData ? menuData[activeCategory] || [] : [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 py-6">
                <div className="max-w-sm mx-auto text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">TableTech</h1>
                    <p className="text-gray-600">Tafel {tableId} • {restaurantName}</p>
                </div>
            </div>

            {/* Popup knop */}
            <div className="fixed top-5 right-5 z-50">
                <button
                    onClick={() => setShowPopup(true)}
                    className="bg-white text-black p-3 rounded-full shadow-lg border"
                >
                    🧍
                </button>
            </div>

            {/* Popup */}
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

            {/* Category Pills */}
            <div className="bg-white px-4 py-4 shadow-sm">
                <div className="max-w-sm mx-auto">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    activeCategory === category
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Items Grid */}
            <div className="px-4 py-6 pb-32">
                <div className="max-w-sm mx-auto">
                    {error && (
                        <p className="text-red-600 text-center text-sm mb-4">{error}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {currentItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                            >
                                {/* Product Image */}
                                <div className="aspect-square w-full bg-gray-100">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-4xl text-gray-300">🍽️</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 mb-1 text-sm">
                                        {item.name}
                                    </h3>
                                    {item.description && (
                                        <p className="text-xs text-gray-600 mb-3">
                                            {item.description}
                                        </p>
                                    )}

                                    {/* Price and Add Button */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold text-gray-800">
                                            €{Number(item.price).toFixed(2)}
                                        </span>
                                        
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {currentItems.length === 0 && !error && (
                        <div className="text-center py-8">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl text-gray-400">🍽️</span>
                            </div>
                            <p className="text-gray-500">Geen items in deze categorie</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 px-4 py-4">
                    <div className="max-w-sm mx-auto">
                        <button
                            onClick={handleGoToCart}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg"
                        >
                            🛍️ Bekijk bestelling ({totalItems} items – €{total.toFixed(2)})
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}