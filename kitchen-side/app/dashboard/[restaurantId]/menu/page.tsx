"use client";

import { useParams } from 'next/navigation';
import { MenuPage } from '@/features/menu';

export default function MenuPageRoute() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;
  
  return <MenuPage restaurantId={restaurantId} />;
}
