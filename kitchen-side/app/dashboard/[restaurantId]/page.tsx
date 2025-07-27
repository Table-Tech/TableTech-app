"use client";

import { useParams } from "next/navigation";
import { OrdersPage } from "@/features/orders";

export default function DashboardPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  return <OrdersPage restaurantId={restaurantId} />;
}
