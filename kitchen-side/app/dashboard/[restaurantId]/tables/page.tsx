"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:3001"; // pas dit aan indien nodig

type Table = {
  id: string;
  name: string;
  status: string;
  code: string;
  restaurantId: string;
  guests?: number;
  reservationTime?: string;
  time?: number;
  orders?: number;
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
        console.log("Tables API response:", result); // zie wat er echt terugkomt
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
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
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
        status: status.toUpperCase(), // API verwacht hoofdletters zoals "AVAILABLE"
      }),
    });

    if (res.ok) {
      const result = await res.json();
      setTables([...tables, result.data]);
      form.reset();
      setShowForm(false);
    } else {
      const err = await res.json();
      alert("Tafel toevoegen mislukt: " + err.message);
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
            <option value="CHECK">Open rekening</option>
            <option value="WAITING">Wacht op bestelling</option>
            <option value="CLEANING">Schoonmaken</option>
          </select>
          <button
            type="submit"
            className="bg-[#12395B] text-white px-4 py-2 rounded hover:bg-[#0a2e4a]"
          >
            Toevoegen
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded shadow border-t-4 border-gray-300 flex flex-col p-4`}
          >
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-[#0a3c6e]">
                {table.name}
              </span>
              <span className="text-sm bg-gray-100 px-3 py-1 rounded-full uppercase text-gray-700 font-medium">
                {table.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Code: {table.code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
