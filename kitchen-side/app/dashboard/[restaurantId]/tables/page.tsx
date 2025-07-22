"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:3001"; // pas dit aan indien nodig

type Table = {
  id: string;
  number?: number;
  status: string;
  code: string;
  restaurantId: string;
  capacity?: number;
  guests?: number;
  reservationTime?: string;
  time?: number;
  orders?: number;
  qrCodeUri?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Helper function to get status color and display text
const getStatusConfig = (status: string) => {
  const configs = {
    AVAILABLE: {
      color: 'border-green-400',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      badgeColor: 'bg-green-100 text-green-800',
      display: 'Beschikbaar'
    },
    OCCUPIED: {
      color: 'border-orange-400',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      badgeColor: 'bg-orange-100 text-orange-800',
      display: 'Bezet'
    },
    RESERVED: {
      color: 'border-blue-400',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      badgeColor: 'bg-blue-100 text-blue-800',
      display: 'Gereserveerd'
    },
    MAINTENANCE: {
      color: 'border-gray-400',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      badgeColor: 'bg-gray-100 text-gray-800',
      display: 'Schoonmaken'
    }
  };
  return configs[status as keyof typeof configs] || configs.AVAILABLE;
};

export default function TablesPage() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const [tables, setTables] = useState<Table[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/tables?restaurantId=${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const result = await res.json();
        console.log("Tables API response:", result);
        setTables(result ?? []);
      } else {
        console.error("Fout bij ophalen van tafels");
      }
    };

    fetchTables();
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const capacity = (form.elements.namedItem("capacity") as HTMLInputElement).value;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;

    const number = tables.length + 1;
    const code = `table-${number}`;

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        number,
        code,
        restaurantId,
        capacity: parseInt(capacity) || 4,
        status: status.toUpperCase(),
      }),
    });

    if (res.ok) {
      const result = await res.json();
      // Add the new table to the list
      setTables([...tables, result.data || result]);
      form.reset();
      setShowForm(false);
    } else {
      const err = await res.json();
      console.error("API Error:", err);
      alert("Tafel toevoegen mislukt: " + (err.message || "Unknown error"));
    }
  };

  return (
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
          className="bg-white p-6 rounded-lg shadow-md max-w-md space-y-4 mb-6"
        >
          <h2 className="text-lg font-semibold text-[#12395B]">
            Nieuwe tafel toevoegen
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capaciteit (aantal personen)
            </label>
            <input
              name="capacity"
              type="number"
              placeholder="4"
              min="1"
              max="20"
              defaultValue="4"
              className="w-full border border-gray-300 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              className="w-full border border-gray-300 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue="AVAILABLE"
            >
              <option value="AVAILABLE">Beschikbaar</option>
              <option value="OCCUPIED">Bezet</option>
              <option value="RESERVED">Gereserveerd</option>
              <option value="MAINTENANCE">Schoonmaken</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-[#12395B] text-white px-4 py-2 rounded hover:bg-[#0a2e4a] flex-1"
            >
              Toevoegen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => {
          const statusConfig = getStatusConfig(table.status);
          const tableNumber = table.number || parseInt(table.code.replace('table-', '')) || 1;
          
          return (
            <div
              key={table.id}
              className={`bg-white rounded-lg shadow-md border-t-4 ${statusConfig.color} ${statusConfig.bgColor} p-6 hover:shadow-lg transition-shadow`}
            >
              {/* Header with table name and status */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${statusConfig.textColor}`}>
                    Tafel {tableNumber}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Code: {table.code}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.badgeColor}`}>
                  {statusConfig.display}
                </span>
              </div>

              {/* Table details */}
              <div className="space-y-2 mb-4">
                {table.capacity && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    Capaciteit: {table.capacity} personen
                  </div>
                )}
                
                {table.guests && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    {table.guests} gasten
                  </div>
                )}

                {table.orders && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    {table.orders} bestellingen
                  </div>
                )}

                {table.reservationTime && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    Gereserveerd voor {table.reservationTime}
                  </div>
                )}
              </div>

              {/* Action buttons based on status */}
              <div className="flex gap-2">
                {table.status === 'AVAILABLE' && (
                  <>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      Reserveren
                    </button>
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      Zet gasten neer
                    </button>
                  </>
                )}
                
                {table.status === 'OCCUPIED' && (
                  <>
                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                      Details
                    </button>
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      Order
                    </button>
                  </>
                )}

                {table.status === 'RESERVED' && (
                  <>
                    <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                      Annuleren
                    </button>
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      Check In
                    </button>
                  </>
                )}

                {table.status === 'MAINTENANCE' && (
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Markeer als beschikbaar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">Geen tafels gevonden</div>
          <div className="text-gray-400 text-sm">Voeg je eerste tafel toe om te beginnen</div>
        </div>
      )}
    </div>
  );
}