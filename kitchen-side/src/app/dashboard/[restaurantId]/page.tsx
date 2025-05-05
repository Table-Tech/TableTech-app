'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { mockOrders, Order } from "../../../lib/mockdata";

export default function DashboardPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(mockOrders[restaurantId] ?? []);
  }, [restaurantId]);

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0a3c6e] mb-6">Live Orders</h1>

      {orders.length === 0 ? (
        <p className="text-[#0a3c6e]">Geen bestellingen gevonden.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-5 rounded-xl shadow-md border border-slate-100"
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0a3c6e]">
                    Tafel {order.table}
                  </h2>
                  <p className="text-sm text-slate-500">Order ID: {order.id}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Aantal items: {order.items.length}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
