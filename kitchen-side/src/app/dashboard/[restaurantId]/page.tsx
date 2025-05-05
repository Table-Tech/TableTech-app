'use client'

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { mockMenuItems, mockOrders, MenuItem, Order } from "../../../lib/mockdata";

export default function DashboardPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setMenu(mockMenuItems[restaurantId] ?? []);
    setOrders(mockOrders[restaurantId] ?? []);
  }, [restaurantId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard ({restaurantId})</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Live Orders</h2>
        <ul>
          {orders.map((order) => (
            <li key={order.id}>
              Table {order.table} - {order.status}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Menu</h2>
        <ul>
          {menu.map((item) => (
            <li key={item.id}>
              {item.title} - €{item.price}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
