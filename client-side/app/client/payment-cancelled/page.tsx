"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentCancelledPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [loading, setLoading] = useState(true);
    const [tableCode, setTableCode] = useState<string | null>(null);
    
    useEffect(() => {
        // Get table code from localStorage or URL
        const storedTableCode = localStorage.getItem('tableCode');
        const urlTableCode = searchParams.get('tableCode');
        
        const finalTableCode = storedTableCode || urlTableCode;
        setTableCode(finalTableCode);
        setLoading(false);
        
        console.log('💳 DEBUG: Payment cancelled page loaded');
        console.log('💳 DEBUG: Table code:', finalTableCode);
    }, [searchParams]);

    const handleBackToMenu = () => {
        if (tableCode) {
            const menuUrl = `/table/${tableCode}`;
            console.log('💳 DEBUG: Redirecting to menu:', menuUrl);
            router.push(menuUrl);
        } else {
            // Fallback: try to go back
            router.back();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
                <div className="text-center w-full max-w-sm mx-auto">
                    <div className="relative mb-6">
                        <div className="w-12 h-12 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500 mx-auto"></div>
                    </div>
                    <p className="text-gray-600 text-lg font-medium">Laden...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg max-w-sm w-full mx-auto">
                <div className="text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-xl sm:text-2xl font-bold text-orange-600 mb-4">
                        Betaling Onderbroken
                    </h1>
                    
                    {/* Description */}
                    <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                        Je betaling is onderbroken of geannuleerd. 
                        <br />
                        Je bestelling is niet geplaatst.
                    </p>
                    
                    {/* Actions */}
                    <button
                        onClick={handleBackToMenu}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base mb-4"
                    >
                        Terug naar Menu
                    </button>
                    
                    {/* Help text */}
                    <p className="text-xs text-gray-500 mt-4">
                        Hulp nodig? Vraag het aan de bediening.
                    </p>
                </div>
            </div>
        </div>
    );
}