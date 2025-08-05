"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function CartPage() {
    const router = useRouter();
    const { restaurantId, tableId } = useParams() as {
        restaurantId: string;
        tableId: string;
    };

    const [cartItems, setCartItems] = useState<any[]>([]);
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [startExitTransition, setStartExitTransition] = useState(false);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        const storedCart = localStorage.getItem("cart");
        if (storedCart) {
            try {
                const parsedCart = JSON.parse(storedCart);
                setCartItems(parsedCart);
            } catch (error) {
                console.error("Error parsing cart:", error);
                setCartItems([]);
            }
        }

        // Fetch table number
        const fetchTableInfo = async () => {
            try {
                const tableCode = localStorage.getItem("tableCode") || tableId;
                const menuRes = await fetch(
                    `http://localhost:3001/api/menu/customer/${tableCode}/${restaurantId}`
                );
                const menuRaw = await menuRes.json();
                const tableNumber = menuRaw?.data?.table?.number;
                setTableNumber(tableNumber);
            } catch (err) {
                console.error("Error fetching table info:", err);
            }
        };

        fetchTableInfo();

        const timeout = setTimeout(() => setShowContent(true), 400);
        return () => clearTimeout(timeout);
    }, [restaurantId, tableId]);

    const updateQuantity = (id: number, value: string) => {
        const parsed = parseInt(value);
        const newQuantity = isNaN(parsed) ? 0 : parsed;
        const updated = cartItems.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        );
        setCartItems(updated);
        localStorage.setItem("cart", JSON.stringify(updated));
    };

    const removeItem = (id: number) => {
        const updated = cartItems.filter((item) => item.id !== id);
        setCartItems(updated);
        localStorage.setItem("cart", JSON.stringify(updated));
    };

    const total = cartItems.reduce((sum: number, item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return sum + price * qty;
    }, 0);

    const handlePlaceOrder = async () => {
        const hasInvalid = cartItems.some(
            (item) =>
                item.quantity === 0 ||
                item.quantity === "" ||
                isNaN(item.quantity) ||
                !item.id
        );

        if (hasInvalid || cartItems.length === 0) {
            setError("Verwijder/corrigeer lege hoeveelheden voordat je bestelt.");
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            const tableCode = localStorage.getItem("tableCode") || String(tableId);

            const paymentPayload = {
                tableCode: tableCode,
                items: cartItems.map((item) => ({
                    menuId: String(item.id),
                    quantity: parseInt(item.quantity),
                    modifiers: item.modifiers ? item.modifiers.map((m: string) => String(m)) : [],
                    notes: item.notes || undefined
                })),
                description: `Order via Tafel ${tableNumber || tableCode}`,
                notes: undefined
            };

            const paymentRes = await fetch(
                "http://localhost:3001/api/payments/create-with-order",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(paymentPayload),
                }
            );

            if (!paymentRes.ok) {
                let errorMessage = "Er ging iets mis tijdens het plaatsen van de bestelling.";
                try {
                    const errJson = await paymentRes.json();
                    if (errJson?.error) errorMessage = errJson.error;
                } catch { }
                throw new Error(errorMessage);
            }

            const paymentData = await paymentRes.json();
            if (paymentData.success && paymentData.checkoutUrl) {
                localStorage.removeItem("cart");
                window.location.href = paymentData.checkoutUrl;
            } else {
                setError("Kon geen betaling starten.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Er ging iets mis tijdens het plaatsen van de bestelling.");
        }
    };

    const getItemCardColor = (index: number) => {
        const colors = [
            "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200",
            "bg-gradient-to-br from-blue-50 to-sky-100 border-blue-200",
            "bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200",
            "bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200",
            "bg-gradient-to-br from-pink-50 to-rose-100 border-pink-200"
        ];
        return colors[index % colors.length];
    };

    const getItemTextColor = (index: number) => {
        const colors = [
            "text-green-700",
            "text-blue-700",
            "text-orange-700",
            "text-purple-700",
            "text-pink-700"
        ];
        return colors[index % colors.length];
    };

    return (
        <>
            {showContent && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-screen flex flex-col bg-gray-50 text-black"
                >
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 px-4 py-6">
                        <div className="max-w-sm mx-auto">
                            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">TableTech</h1>
                            <p className="text-center text-gray-600 mb-4">Jouw Bestelling • Tafel {tableNumber || tableId}</p>
                            <div className="bg-green-100 rounded-full px-4 py-2 text-center">
                                <span className="text-green-700 font-semibold">
                                    {cartItems.reduce((t, i) => t + (i.quantity || 0), 0)} item
                                    {cartItems.reduce((t, i) => t + (i.quantity || 0), 0) !== 1 ? "s" : ""} toegevoegd
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <main className="flex-1 overflow-y-auto px-4 py-6">
                        <div className="max-w-sm mx-auto space-y-4">
                            {cartItems.length === 0 ? (
                                <div className="text-center mt-20">
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">🛒</span>
                                    </div>
                                    <p className="text-gray-500 text-lg">Je winkelwagen is leeg.</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {cartItems.map((item: any, index: number) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className={`${getItemCardColor(index)} rounded-2xl p-4 border-2 shadow-sm`}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shadow-sm">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name || "Product"}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-2xl">🍽️</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className={`font-bold text-lg ${getItemTextColor(index)}`}>
                                                                {item.quantity}x {item.name}
                                                            </h3>
                                                            {item.modifiers?.length > 0 && (
                                                                <p className="text-sm text-gray-600">
                                                                    {item.modifiers.join(", ")}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`font-bold text-xl ${getItemTextColor(index)}`}>
                                                            €{(item.price * (isNaN(item.quantity) ? 0 : item.quantity)).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => updateQuantity(item.id, String(Math.max(1, item.quantity - 1)))}
                                                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                inputMode="numeric"
                                                                value={item.quantity === 0 || isNaN(item.quantity) ? "" : String(item.quantity)}
                                                                onChange={(e) => updateQuantity(item.id, e.target.value)}
                                                                className="w-12 text-center py-1 border border-gray-300 rounded-lg bg-white shadow-sm text-sm"
                                                            />
                                                            <button
                                                                onClick={() => updateQuantity(item.id, String(item.quantity + 1))}
                                                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                                                        >
                                                            Verwijder
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </main>

                    {/* Footer */}
                    <motion.footer
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
                        className="bg-white border-t border-gray-200 px-4 py-6"
                    >
                        <div className="max-w-sm mx-auto">
                            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Subtotaal:</span>
                                    <span className="font-semibold">€{total.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-800">Totaal:</span>
                                        <span className="text-xl font-bold text-gray-800">€{total.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-lg mb-3"
                                onClick={handlePlaceOrder}
                                disabled={cartItems.length === 0}
                            >
                                Bestelling Plaatsen
                            </button>
                            <button
                                className="w-full text-gray-600 text-center py-2"
                                onClick={() => {
                                    setStartExitTransition(true);
                                    setTimeout(() => {
                                        router.push(`/client/${restaurantId}/${tableId}`);
                                    }, 600);
                                }}
                            >
                                ← Terug naar menu
                            </button>
                        </div>
                    </motion.footer>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                                className="fixed bottom-32 left-0 right-0 px-4 z-50 pointer-events-none"
                            >
                                <div className="bg-red-500 text-white text-center py-3 rounded-xl shadow-md max-w-sm mx-auto text-sm font-medium pointer-events-auto">
                                    {error}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Exit Transition */}
            <AnimatePresence>
                {startExitTransition && (
                    <motion.div
                        initial={{ y: "-100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{
                            y: { duration: 0.5, ease: "easeInOut" },
                            opacity: { duration: 0.3 },
                        }}
                        className="fixed inset-0 z-50 bg-white"
                    >
                        <div className="h-full flex items-center justify-center">
                            <p className="text-xl font-bold animate-pulse">Terug naar menu...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
