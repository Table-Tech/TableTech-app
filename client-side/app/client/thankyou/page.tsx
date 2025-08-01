"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ThankYouPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [orderData, setOrderData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('🎉 DEBUG: Thank you page loaded');
        console.log('🎉 DEBUG: Current URL:', window.location.href);
        console.log('🎉 DEBUG: URL search params:', window.location.search);
        console.log('🎉 DEBUG: Order ID from params:', orderId);

        if (!orderId) {
            setError("Geen bestelling-ID gevonden");
            setLoading(false);
            return;
        }

        // Fetch order details and check payment status
        const fetchOrderDetailsAndCheckPayment = async () => {
            try {
                console.log('🎉 DEBUG: Thank you page - fetching order details for:', orderId);
                
                // First get order details
                const orderResponse = await fetch(`http://localhost:3001/api/orders/customer/orders/id/${orderId}`);
                if (orderResponse.ok) {
                    const orderData = await orderResponse.json();
                    setOrderData(orderData.data);
                    console.log('🎉 DEBUG: Order data received:', orderData.data);
                    
                    // Try to get payment ID from URL params if available
                    const urlParams = new URLSearchParams(window.location.search);
                    const paymentId = urlParams.get('paymentId');
                    
                    console.log('🎉 DEBUG: All URL params:', Object.fromEntries(urlParams.entries()));
                    
                    if (paymentId) {
                        console.log('🎉 DEBUG: Found payment ID in URL, checking status:', paymentId);
                        
                        // Check payment status to trigger webhook processing if needed
                        try {
                            const statusResponse = await fetch(`http://localhost:3001/api/payments/check-status`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ paymentId })
                            });
                            
                            if (statusResponse.ok) {
                                const statusData = await statusResponse.json();
                                console.log('🎉 DEBUG: Payment status check result:', statusData);
                            } else {
                                console.log('🎉 DEBUG: Payment status check failed with status:', statusResponse.status);
                            }
                        } catch (statusError) {
                            console.log('🎉 DEBUG: Payment status check failed:', statusError);
                        }
                    } else {
                        console.log('🎉 DEBUG: No payment ID in URL params');
                    }
                } else {
                    console.log("Could not fetch order details, but payment was successful");
                }
            } catch (err) {
                console.log("Could not fetch order details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetailsAndCheckPayment();

        // Clear cart
        localStorage.removeItem("cart");
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="relative mb-6">
                        <div className="w-12 h-12 border-4 border-green-200 rounded-full animate-spin border-t-green-500 mx-auto"></div>
                        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-green-300"></div>
                    </div>
                    <p className="text-gray-600 text-lg font-medium">Laden...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Oeps!</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-all duration-300"
                        >
                            Probeer opnieuw
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6">

            <div className="max-w-sm mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-4">
                    <h1 className="text-3xl font-bold text-green-600 mb-2">TableTech</h1>
                    <p className="text-gray-600 text-lg">
                        Bestelling Status {orderData?.table ? `• Tafel ${orderData.table.number}` : ''}
                    </p>
                </div>

                {/* Success Card */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-4 border border-green-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -translate-y-16 translate-x-16 opacity-30"></div>
                    <div className="relative text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <span className="text-white text-3xl font-bold">✓</span>
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-3">Bestelling Bevestigd!</h2>
                        <p className="text-green-600 font-medium text-lg">Je eten wordt nu bereid</p>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 text-center mb-6">Voortgang</h3>
                    
                    <div className="space-y-4">
                        {/* Order Received */}
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4 shadow-md">
                                <span className="text-white font-bold text-lg">✓</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 text-lg">Bestelling Ontvangen</h4>
                                <p className="text-sm text-gray-600">
                                    {new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})} - Betaling verwerkt
                                </p>
                            </div>
                        </div>

                        {/* In Kitchen */}
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mr-4 shadow-md">
                                <span className="text-white text-xl">🔍</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 text-lg">In de Keuken</h4>
                                <p className="text-sm text-gray-600">Nu bezig - geschatte tijd: 8 min</p>
                            </div>
                        </div>

                        {/* On the way */}
                        <div className="flex items-center opacity-50">
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
                                <span className="text-gray-600 text-xl">👥</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-600 text-lg">Onderweg naar Tafel</h4>
                                <p className="text-sm text-gray-500">Volgt snel...</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                {orderData && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-4     border border-blue-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-blue-800">Bestellingsoverzicht</h3>
                            <span className="text-2xl font-bold text-blue-800">
                                €{Number(orderData.totalAmount).toFixed(2)}
                            </span>
                        </div>
                        
                        <div className="bg-white rounded-xl p-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">Bestelling:</p>
                                <p className="font-semibold text-gray-800 text-lg">#{orderData.orderNumber}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Back Button */}
                <button
                    onClick={() => {
                        console.log('🎉 DEBUG: Sluiten button clicked');
                        
                        // Get table code from localStorage (which we know exists)
                        const tableCode = localStorage.getItem('tableCode');
                        console.log('🎉 DEBUG: Table code from localStorage:', tableCode);
                        
                        if (tableCode) {
                            // Go back to the table's menu page
                            const menuUrl = `/table/${tableCode}`;
                            console.log('🎉 DEBUG: Redirecting to:', menuUrl);
                            window.location.href = menuUrl;
                        } else {
                            console.log('🎉 DEBUG: No table code found, trying to close window');
                            window.close();
                        }
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg mb-6"
                >
                    Terug naar menu
                </button>
            </div>
        </div>
    );
}