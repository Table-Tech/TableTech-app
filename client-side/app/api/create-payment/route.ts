import { NextRequest, NextResponse } from "next/server";

/**
 * DEPRECATED: This endpoint is replaced by the secure API payment system
 * All payments should go through /api/payments/create for security and consistency
 * 
 * This endpoint now redirects to the proper API endpoint
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { totalAmount, orderId, tableId } = body;

    // Validation
    if (!orderId) {
        return NextResponse.json({ 
            error: "Order ID is required. Use the API payment system." 
        }, { status: 400 });
    }

    try {
        // Call the secure API endpoint instead of direct Mollie
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/payments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any required authentication headers here
            },
            body: JSON.stringify({
                orderId,
                amount: totalAmount,
                description: `Bestelling voor tafel ${tableId}`,
                metadata: { tableId }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Payment creation failed');
        }

        const paymentData = await response.json();
        
        return NextResponse.json({ 
            url: paymentData.checkoutUrl,
            paymentId: paymentData.paymentId
        }, { status: 200 });

    } catch (err) {
        console.error("Payment creation failed:", err);
        return NextResponse.json({ 
            error: "Payment creation failed. Please try again." 
        }, { status: 500 });
    }
}
