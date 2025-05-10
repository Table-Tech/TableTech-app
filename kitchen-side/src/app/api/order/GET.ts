import { NextResponse } from "next/server";
import { mockMenuItems } from "@/lib/mockdata";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("r");

  if (!restaurantId || !mockMenuItems[restaurantId]) {
    return NextResponse.json({ error: "Menu niet gevonden" }, { status: 404 });
  }

  const items = mockMenuItems[restaurantId];
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const cat = item.category || "Overig";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return NextResponse.json(grouped);
}
