"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

//client-side/app/client/[restaurantId]/[tableId]/thankyou/page.tsx

export default function ThankYouPage() {
    const router = useRouter();
    const { tableId, restaurantId } = useParams() as {
        tableId: string;
        restaurantId: string;
    };

    useEffect(() => {
        localStorage.removeItem("cart");
    }, []);

    if (!tableId || !restaurantId) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 text-center">
                <p className="text-red-600 font-semibold">
                    Geen tafel- of restaurant-ID gevonden. Scan opnieuw via de QR-code.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="bg-white p-6 rounded-xl shadow-md max-w-sm text-center">
                <h1 className="text-xl font-bold mb-2">Bedankt voor uw bestelling</h1>
                <p className="text-sm text-gray-600 mb-4">
                    Wij hebben uw bestelling succesvol ontvangen.<br />
                    Wij zullen de rest afhandelen.
                </p>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Uw tafelnummer:
                    </label>
                    <input
                        type="text"
                        value={tableId}
                        disabled
                        className="w-full border border-gray-300 rounded-lg p-2 text-center text-lg"
                    />
                </div>

                <button
                    onClick={() => router.push(`/client/${restaurantId}/${tableId}`)}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-lg font-semibold text-sm"
                >
                    Terug naar menu kaart →
                </button>
            </div>
        </div>
    );
}
