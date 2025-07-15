import { NextRequest, NextResponse } from "next/server";
import createMollieClient from "@mollie/api-client";

const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { totalAmount, tableId, restaurantId } = body;

    if (!totalAmount || !tableId || !restaurantId) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    try {
        const payment = await mollie.payments.create({
            amount: {
                value: totalAmount.toFixed(2),
                currency: "EUR",
            },
            description: `Bestelling voor tafel ${tableId}`,
            redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/client/${restaurantId}/${tableId}/thankyou`,
            metadata: {
                tableId,
                restaurantId,
            },
        });

        return NextResponse.json({ url: payment.getCheckoutUrl() }, { status: 200 });
    } catch (err) {
        console.error("Mollie fout:", err);
        return NextResponse.json({ error: "Betaling mislukt" }, { status: 500 });
    }
}
