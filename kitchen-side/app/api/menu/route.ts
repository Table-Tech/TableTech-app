// This API route is deprecated - now using real API
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({ 
    error: "This endpoint is deprecated. Use the real API." 
  }, { 
    status: 410,
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}
