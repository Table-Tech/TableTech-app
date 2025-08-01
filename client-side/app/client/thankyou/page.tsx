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
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600">Laden...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="bg-white p-6 rounded-xl shadow-md max-w-sm text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">Oeps!</h1>
                    <p className="text-sm text-gray-600 mb-4">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="bg-white p-6 rounded-xl shadow-md max-w-sm text-center">
                <div className="text-6xl mb-4">✅</div>
                <h1 className="text-xl font-bold mb-2">Bedankt voor uw bestelling!</h1>
                <p className="text-sm text-gray-600 mb-4">
                    Uw betaling is succesvol verwerkt.<br />
                    Wij hebben uw bestelling ontvangen en zullen deze spoedig voorbereiden.
                </p>

                {orderData && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">Bestelling: #{orderData.orderNumber}</p>
                        <p className="text-sm text-gray-600">Totaal: €{Number(orderData.totalAmount).toFixed(2)}</p>
                        {orderData.table && (
                            <p className="text-sm text-gray-600">Tafel: {orderData.table.number}</p>
                        )}
                    </div>
                )}

                <button
                    onClick={() => {
                        // Try to go back to the original menu or just close the window
                        if (window.history.length > 1) {
                            window.history.back();
                        } else {
                            window.close();
                        }
                    }}
                    className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-semibold text-sm"
                >
                    Sluiten
                </button>
            </div>
        </div>
    );
}