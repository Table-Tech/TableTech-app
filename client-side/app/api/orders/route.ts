//clientside/app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { restaurantId, tableId, items } = body;

        if (!restaurantId || !tableId || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
        }

        // Hier zou je de bestelling in een database opslaan
        console.log("✅ Nieuwe bestelling ontvangen:", { restaurantId, tableId, items });

        return NextResponse.json({ message: "Bestelling opgeslagen" });
    } catch (err) {
        console.error("❌ Fout bij opslaan bestelling:", err);
        return NextResponse.json({ error: "Serverfout" }, { status: 500 });
    }
}
