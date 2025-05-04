"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import MenuItem from "./components/MenuItem";

const mockMenu = [
    {
        id: 1,
        name: "Margherita Pizza",
        description: "Klassieke pizza met tomatensaus, mozzarella en basilicum",
        price: 9.95,
        image: "/pizza.jpg",
    },
    {
        id: 2,
        name: "Caesar Salad",
        description: "Krokante sla met kip, parmezaan en croutons",
        price: 7.5,
        image: "/salad.jpg",
    },
];

export default function ClientPage() {
    const params = useParams();
    const tableId = params.tableId as string;

    const [cart, setCart] = useState<any[]>([]);

    const handleAddToCart = (item: any, quantity: number) => {
        const existing = cart.find((i) => i.id === item.id);
        if (existing) {
            setCart(
                cart.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
                )
            );
        } else {
            setCart([...cart, { ...item, quantity }]);
        }
    };

    return (
        <main className="p-4 max-w-md mx-auto pb-32 space-y-4 bg-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Menu voor tafel {tableId}</h1>

            <div className="grid gap-4">
                {mockMenu.map((item) => (
                    <MenuItem key={item.id} item={item} onAdd={handleAddToCart} />
                ))}
            </div>

            {cart.length > 0 && (
                <button className="fixed bottom-4 left-4 right-4 bg-black text-white text-lg py-3 rounded-xl shadow-lg z-50 hover:bg-gray-800 transition">
                    🛒 Bekijk bestelling ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)
                </button>
            )}
        </main>
    );
}
