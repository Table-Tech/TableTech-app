"use client";
import { useState } from "react";

export default function MenuItem({ item, onAdd }: { item: any; onAdd: (item: any, quantity: number) => void }) {
    const [quantity, setQuantity] = useState(1);

    return (
        <div className="rounded-2xl shadow-md bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
                {item.image && (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl border"
                    />
                )}
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">{item.name}</h2>
                    <p className="text-sm text-gray-500">{item.description}</p>
                    <p className="text-base font-bold mt-2">€ {item.price.toFixed(2)}</p>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-16 border rounded px-2 py-1 text-center"
                />
                <button
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                    onClick={() => onAdd(item, quantity)}
                >
                    Voeg toe
                </button>
            </div>
        </div>
    );
}
