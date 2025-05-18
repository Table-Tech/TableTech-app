'use client'

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { mockOrders, Order, mockMenuItems, MenuItem } from "@/lib/mockdata";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Calendar, Download } from "lucide-react";

interface TopSellingItem {
  name: string;
  sales: number;
  revenue: number;
}

interface RecentTransaction {
  id: string;
  time: string;
  amount: string;
  type: string;
  items: string;
}

export default function StatisticsPage() {
  const restaurantId = useParams().restaurantId as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [topSelling, setTopSelling] = useState<TopSellingItem[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState("");

  useEffect(() => {
    if (restaurantId) {
      const filteredOrders = Object.values(mockOrders)
        .flat()
        .filter((order) => {
          return true; // Adjust this filter based on your actual data structure
        });
      setOrders(filteredOrders);
    }

    // Set the current month and year on component mount
    const today = new Date();
    const month = today.toLocaleString("nl-NL", { month: "long" }); // Get month name in Dutch
    const year = today.getFullYear();
    setCurrentMonthYear(`${month} ${year}`);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId && orders.length > 0) {
      const restaurantMenuItems = mockMenuItems[restaurantId] || [];
      const itemCounts: Record<string, number> = {};
      const itemRevenue: Record<string, number> = {};

      orders.forEach((order) => {
        order.items.forEach((itemId: string) => {
          itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
          const menuItem = restaurantMenuItems.find((item) => item.id === itemId);
          if (menuItem) {
            itemRevenue[itemId] = (itemRevenue[itemId] || 0) + menuItem.price;
          }
        });
      });

      const sortedItems = Object.keys(itemCounts)
        .sort((a, b) => itemCounts[b] - itemCounts[a])
        .slice(0, 5)
        .map((itemId) => {
          const menuItem = restaurantMenuItems.find((item) => item.id === itemId);
          return {
            name: menuItem?.title || "Unknown Item",
            sales: itemCounts[itemId],
            revenue: menuItem?.price ? itemRevenue[itemId] || 0 : 0, // Handle potential undefined price
          } as TopSellingItem;
        });
      setTopSelling(sortedItems);
    }
  }, [restaurantId, orders]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, order: Order) => {
    const restaurantMenuItems = mockMenuItems[restaurantId] || [];
    let orderTotal = 0;
    order.items.forEach((itemId: string) => {
      const menuItem = restaurantMenuItems.find((item: MenuItem) => item.id === itemId);
      if (menuItem) {
        orderTotal += menuItem.price;
      }
    });
    return sum + orderTotal;
  }, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const recentTransactions = orders.slice(-5).map((order: Order): RecentTransaction => {
    const restaurantMenuItems = mockMenuItems[restaurantId] || [];
    const itemNames = order.items
      .map((itemId: string) => restaurantMenuItems.find((item: MenuItem) => item.id === itemId)?.title || "Unknown")
      .join(", ");
    const orderTotal = order.items.reduce((sum: number, itemId: string) => {
      const menuItem = restaurantMenuItems.find((item: MenuItem) => item.id === itemId);
      return sum + (menuItem?.price || 0);
    }, 0);

    return {
      id: order.id,
      time: "N/A",
      amount: `€${orderTotal.toFixed(2)}`,
      type: "N/A",
      items: itemNames,
    };
  });

   return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* New layout integration starts here - Adjusted grid for main content */}
      <div className="p-6 rounded-md mt-4 col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
        <div className="flex justify-between items-center mb-6"> {/* Flex container for title and buttons */}
          <h1 className="text-2xl font-bold text-[#12395B] ">Statistieken</h1>
          <div className="flex gap-2">
            <button className="bg-gray-100 rounded-md border border-gray-300 text-[#12395B] py-2 px-4 flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-[#12395B]" /> {currentMonthYear}
            </button>
            <button className="bg-gray-100 rounded-md border border-gray-300 text-[#12395B] py-2 px-4 flex items-center">
              <Download className="mr-2 h-4 w-4 text-[#12395B]" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1 text-[#12395B]">Totale winst</p>
                <h3 className="text-2xl font-bold text-[#12395B]">€{totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1 text-[#12395B]">Totale bestellingen</p>
                <h3 className="text-2xl font-bold text-[#12395B]">{totalOrders}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Gemiddelde bestelling</p>
                <h3 className="text-2xl font-bold text-[#12395B]">€{averageOrderValue.toFixed(2)}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-md shadow-md lg:col-span-2">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Verkoop overzicht</h2>
              <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md">
                <p className="text-gray-500">Sales chart visualization would appear here</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-md">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Best verkochte items</h2>
              {topSelling.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#12395B]">{item.name}</p>
                    <p className="text-sm text-gray-500 text-[#12395B]">{item.sales} verkocht</p>
                  </div>
                  <p className="font-bold text-[#12395B]">€{item.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-md shadow-md">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Recente Transacties</h2>
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#12395B]">{transaction.id}</p>
                    <p className="text-sm text-[#12395B]">{transaction.items}</p>
                  </div>
                  <p className="font-bold text-[#12395B]">{transaction.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}