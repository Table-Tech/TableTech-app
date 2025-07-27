"use client";

import { useParams } from 'next/navigation';
import TablesPage from '@/features/tables/components/TablesPage';

export default function TablesPageRoute() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  return <TablesPage restaurantId={restaurantId} />;
}
