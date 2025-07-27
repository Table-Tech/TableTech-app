"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { OrderStatistics } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import { Calendar, Download } from "lucide-react";

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
  const [stats, setStats] = useState<OrderStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonthYear, setCurrentMonthYear] = useState("");

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!restaurantId) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.getOrderStatistics(restaurantId);
        
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError('Failed to fetch statistics');
        }
      } catch (error) {
        setError('Network error');
        console.error('Error fetching statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();

    // Set the current month and year on component mount
    const today = new Date();
    const month = today.toLocaleString("nl-NL", { month: "long" }); // Get month name in Dutch
    const year = today.getFullYear();
    setCurrentMonthYear(`${month} ${year}`);
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <p>No statistics available</p>
      </div>
    );
  }

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
                <p className="text-sm text-gray-500 mb-1 text-[#12395B]">Vandaag omzet</p>
                <h3 className="text-2xl font-bold text-[#12395B]">€{stats.todayRevenue.toFixed(2)}</h3>
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
                <h3 className="text-2xl font-bold text-[#12395B]">{stats.totalOrders}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Vandaag bestellingen</p>
                <h3 className="text-2xl font-bold text-[#12395B]">{stats.todayOrders}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Actieve bestellingen</p>
                <h3 className="text-2xl font-bold text-[#12395B]">{stats.activeOrders}</h3>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
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
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2 text-[#12395B]">Best verkochte items</h2>
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">Best selling items data niet beschikbaar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}