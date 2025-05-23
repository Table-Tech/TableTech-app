"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function CartPage() {
    const router = useRouter();
    const params = useParams();
    const tableId = params.tableId as string;

    const [cartItems, setCartItems] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [startExitTransition, setStartExitTransition] = useState(false);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        const storedCart = localStorage.getItem("cart");
        if (storedCart) {
            setCartItems(JSON.parse(storedCart));
        }

        const timeout = setTimeout(() => setShowContent(true), 400);
        return () => clearTimeout(timeout);
    }, []);

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

    const handlePlaceOrder = async () => {
        const hasInvalid = cartItems.some(
            (item) => item.quantity === 0 || item.quantity === "" || isNaN(item.quantity)
        );

        if (hasInvalid) {
            setError("Verwijder/corrigeer lege hoeveelheden voordat je bestelt.");
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            const res = await fetch("/api/create-payment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    totalAmount: total,
                    tableId,
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url; // ✅ Redirect naar Mollie checkout
            } else {
                setError("Kon geen betaling starten.");
            }
        } catch (err) {
            console.error(err);
            setError("Er ging iets mis tijdens betaling.");
        }
    };

    const total = cartItems.reduce((sum: number, item: any) => {
        const qty = isNaN(item.quantity) ? 0 : item.quantity;
        return sum + item.price * qty;
    }, 0);

    return (
        <>
            {showContent && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col min-h-screen bg-white text-black relative"
                >
                    {/* Sticky Header incl. totaal */}
                    <div className="sticky top-0 bg-white z-40 w-full border-b border-gray-300">
                        <div className="max-w-md mx-auto px-4 pt-6 pb-2">
                            <h1 className="text-2xl font-bold text-center">🛒 Winkelwagen</h1>
                            <div className="flex justify-between items-center mt-2 font-bold text-lg">
                                <span>Totaal:</span>
                                <span>€{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable main content */}
                    <main className="relative flex-1 overflow-y-auto max-w-md w-full mx-auto px-4 pb-40">
                        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10" />
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent z-10" />

                        {cartItems.length === 0 ? (
                            <div className="text-gray-500 text-center mt-20 relative z-20">
                                Je winkelwagen is leeg.
                            </div>
                        ) : (
                            <div className="space-y-4 relative z-20">
                                <AnimatePresence>
                                    {cartItems.map((item: any) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-gray-100 rounded-xl p-4 shadow-md w-full"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <h2 className="text-lg font-semibold">{item.title}</h2>
                                                <p className="text-lg font-bold">
                                                    €{(item.price * (isNaN(item.quantity) ? 0 : item.quantity)).toFixed(2)}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                €{item.price.toFixed(2)} × {isNaN(item.quantity) ? 0 : item.quantity}
                                            </p>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    inputMode="numeric"
                                                    value={
                                                        item.quantity === 0 || isNaN(item.quantity)
                                                            ? ""
                                                            : String(item.quantity)
                                                    }
                                                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                                                    className="w-16 text-center px-2 py-1 border border-gray-300 rounded-lg bg-white shadow-sm"
                                                />
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition"
                                                >
                                                    Verwijder
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </main>

                    {/* Footer met fade-up animatie */}
                    <motion.footer
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: "easeOut",
                            delay: 0.6 // na main page (0.4 delay + 0.6 page animatie)
                        }}
                        className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 px-4 py-4"
                    >
                        <div className="max-w-md mx-auto">
                            <button
                                className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition text-center text-lg mb-2"
                                onClick={handlePlaceOrder}
                            >
                                ✅ Plaats bestelling
                            </button>
                            <button
                                className="w-full text-sm text-gray-600 underline text-center"
                                onClick={() => {
                                    setStartExitTransition(true);
                                    setTimeout(() => {
                                        router.push(`/client/${tableId}`);
                                    }, 600);
                                }}
                            >
                                ← Terug naar menu
                            </button>
                        </div>
                    </motion.footer>


                    {/* Toast pop-up */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                                className="fixed bottom-[107px] left-0 right-0 px-4 z-30 pointer-events-none"
                            >
                                <div className="bg-red-500 text-white text-center py-3 rounded-xl shadow-md max-w-md mx-auto text-sm font-medium pointer-events-auto">
                                    {error}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Slide-down white overlay bij terug naar menu */}
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
