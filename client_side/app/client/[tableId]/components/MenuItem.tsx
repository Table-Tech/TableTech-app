"use client";
import { useState } from "react";

export default function MenuItem({
    item,
    onAdd,
}: {
    item: any;
    onAdd: (item: any, quantity: number) => void;
}) {
    const [quantity, setQuantity] = useState(1);

    return (
        <div className="bg-gray-100 rounded-2xl shadow-md p-4 space-y-3">
            <div className="flex gap-4 items-center">
                {/* Afbeelding als nette blok */}
                {item.image && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Tekstblok */}
                <div className="flex-1">
                    <h2 className="text-lg font-semibold">{item.name}</h2>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-base font-bold mt-1">€ {item.price.toFixed(2)}</p>
                </div>
            </div>

            {/* Actieblok */}
            <div className="flex items-center justify-between">
                <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setQuantity(isNaN(val) ? 1 : val);
                    }}
                    className="w-16 border rounded px-2 py-1 text-center bg-white"
                />
                <button
                    onClick={() => onAdd(item, quantity)}
                    className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition"
                >
                    Voeg toe
                </button>
            </div>
        </div>
    );
}
