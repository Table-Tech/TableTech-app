"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { apiClient } from "@/shared/services/api-client";
import { Table } from "@/shared/types";
import { RoleGuard } from '@/shared/components/protection';

export default function TablesPage() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      if (!restaurantId) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.getTables(restaurantId);
        
        if (response.success && response.data) {
          setTables(response.data);
        } else {
          setError('Failed to fetch tables');
        }
      } catch (error) {
        setError('Network error');
        console.error('Error fetching tables:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTables();
  }, [restaurantId]);

  const statusStyles: Record<Table["status"], { border: string; badge: string; label: string }> = {
    AVAILABLE: { border: "border-green-500", badge: "bg-green-100 text-green-800", label: "Beschikbaar" },
    OCCUPIED: { border: "border-orange-500", badge: "bg-orange-100 text-orange-800", label: "Bezet" },
    RESERVED: { border: "border-blue-500", badge: "bg-blue-100 text-blue-800", label: "Gereserveerd" },
    MAINTENANCE: { border: "border-gray-500", badge: "bg-gray-200 text-gray-800", label: "Onderhoud" },
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement API call to create table
    alert('Table creation not implemented yet');
    setShowForm(false);
  };

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

  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF']}>
      <div className="p-8 bg-[#f6fcff] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#0a3c6e]">Tafels</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded shadow flex items-center gap-2"
        >
          + Nieuwe tafel
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow max-w-sm space-y-4 mb-6"
        >
          <h2 className="text-lg font-semibold text-[#12395B]">
            Nieuwe tafel toevoegen
          </h2>
          <input
            name="name"
            type="text"
            placeholder="Tafelnaam"
            className="w-full border px-3 py-2 rounded text-gray-800"
            required
          />
          <select
            name="status"
            className="w-full border px-3 py-2 rounded text-gray-800"
            defaultValue="AVAILABLE"
          >
            <option value="AVAILABLE">Beschikbaar</option>
            <option value="OCCUPIED">Bezet</option>
            <option value="RESERVED">Gereserveerd</option>
            <option value="MAINTENANCE">Onderhoud</option>
          </select>
          <button
            type="submit"
            className="bg-[#12395B] text-white px-4 py-2 rounded hover:bg-[#0a2e4a]"
          >
            Toevoegen
          </button>
        </form>
      )}

      {tables.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🪑</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen tafels beschikbaar</h3>
          <p className="text-gray-600">
            Voeg uw eerste tafel toe om te beginnen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const style = statusStyles[table.status];
            return (
              <div
                key={table.id}
                className={`bg-white rounded shadow border-t-4 ${style.border} flex flex-col p-0`}
              >
                <div className="flex justify-between items-center px-4 pt-3 pb-1">
                  <span className="text-lg font-semibold text-[#0a3c6e]">Tafel {table.number}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${style.badge}`}>{style.label}</span>
                </div>
                <div className="px-4 py-2 flex-1">
                  <div className="mb-2 text-sm text-gray-800">
                    QR Code: {table.code}
                  </div>
                  <div className="mb-2 text-sm text-gray-800">
                    Capaciteit: {table.capacity} personen
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold flex-1">
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </RoleGuard>
  );
}
