"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MenuItem from "./components/MenuItem";

const mockMenu = {
    "Pizza's": [
        {
            id: 1,
            name: "Margherita Pizza",
            description: "Klassieke pizza met tomatensaus, mozzarella en basilicum",
            price: 9.95,
            image: "/margherita.jpg",
        },
        {
            id: 2,
            name: "Pepperoni Pizza",
            description: "Pikante pepperoni met mozzarella",
            price: 11.5,
            image: "/pepperoni.jpg",
        },
    ],
    Salades: [
        {
            id: 3,
            name: "Caesar Salad",
            description: "Krokante sla met kip, parmezaan en croutons",
            price: 7.5,
            image: "/caesar.jpg",
        },
    ],
    Dranken: [
        {
            id: 4,
            name: "Cola",
            description: "Fris en bruisend",
            price: 2.5,
            image: "/cola.jpg",
        },
        {
            id: 5,
            name: "Spa Blauw",
            description: "Plat mineraalwater",
            price: 2.0,
            image: "/spa.jpg",
        },
    ],
};

export default function ClientPage() {
    const params = useParams();
    const router = useRouter();
    const tableId = params.tableId as string;

    const [cart, setCart] = useState<any[]>([]);
    const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});
    const [startTransition, setStartTransition] = useState(false);
    const [startEntryTransition, setStartEntryTransition] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("cart");
        if (stored) {
            const parsed = JSON.parse(stored);
            const filtered = parsed.filter((item: any) => item.quantity >= 1);
            setCart(filtered);
            localStorage.setItem("cart", JSON.stringify(filtered));
        }

        // Trigger de entry-animatie bij laden
        const timeout = setTimeout(() => setStartEntryTransition(false), 600);
        return () => clearTimeout(timeout);
    }, []);

    const handleAddToCart = (item: any, quantity: number) => {
        const existing = cart.find((i) => i.id === item.id);
        let newCart;
        if (existing) {
            newCart = cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
            );
        } else {
            newCart = [...cart, { ...item, quantity }];
        }
        setCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
    };

    const toggleCategory = (category: string) => {
        setOpenCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    const handleGoToCart = () => {
        setStartTransition(true);
        setTimeout(() => {
            router.push(`/client/${tableId}/cart`);
        }, 400);
    };

    return (
        <>
            <AnimatePresence>
                {!startEntryTransition && (
                    <motion.main
                        key="clientMain"
                        initial={{ y: "-100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="p-4 max-w-md mx-auto pb-40 space-y-4 bg-white min-h-screen"
                    >
                        <h1 className="text-2xl font-bold mb-6 text-center">Menu Kaart</h1>

                        {Object.entries(mockMenu).map(([category, items]) => (
                            <div key={category} className="border-b-2 border-gray-300 pb-3">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full text-left text-xl font-bold py-3 flex justify-between items-center"
                                >
                                    {category}
                                    <span className="text-sm">{openCategories[category] ? "▲" : "▼"}</span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {openCategories[category] && (
                                        <motion.div
                                            className="space-y-4 mt-2 overflow-hidden"
                                            initial="collapsed"
                                            animate="open"
                                            exit="collapsed"
                                            variants={{
                                                open: {
                                                    opacity: 1,
                                                    height: "auto",
                                                    transition: { when: "beforeChildren" },
                                                },
                                                collapsed: {
                                                    opacity: 0,
                                                    height: 0,
                                                    transition: { when: "afterChildren" },
                                                },
                                            }}
                                        >
                                            {items.map((item, index) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{
                                                        delay: index === 0 ? 0.05 : 0.15 * index,
                                                        duration: 0.3,
                                                        ease: "easeOut",
                                                    }}
                                                >
                                                    <MenuItem item={item} onAdd={handleAddToCart} />
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </motion.main>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {cart.length > 0 && !startEntryTransition && (
                    <motion.footer
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
                        className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 px-4 py-4"
                    >
                        <div className="max-w-md mx-auto">
                            <button
                                onClick={handleGoToCart}
                                className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition text-center text-lg"
                            >
                                🛍️ Bekijk bestelling ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)
                            </button>
                        </div>
                    </motion.footer>
                )}
            </AnimatePresence>


            <AnimatePresence>
                {startTransition && (
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0 }}
                        transition={{
                            y: { duration: 0.5, ease: "easeInOut" },
                            opacity: { duration: 0.3 },
                        }}
                        className="fixed inset-0 z-50 bg-white"
                    >
                        <div className="h-full flex items-center justify-center">
                            <p className="text-xl font-bold animate-pulse">Laden...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
