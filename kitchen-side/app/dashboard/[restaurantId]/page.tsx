"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/features/dashboard";

export default function Page() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  return <DashboardPage restaurantId={restaurantId} />;
}