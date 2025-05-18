"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { mockTables, Table } from "lib/mockdata";

export default function TablesPage() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const [tables, setTables] = useState<Table[]>(mockTables[restaurantId] ?? []);
  const [showForm, setShowForm] = useState(false);

  const statusLabels: Record<Table["status"], string> = {
    leeg: "🟢 Leeg",
    bezet: "🔴 Bezet",
    gereserveerd: "🟠 Gereserveerd",
    rekening: "💳 Open rekening",
    wachten: "⏳ Wacht op bestelling",
  };

  const statusColor: Record<Table["status"], string> = {
    leeg: "bg-green-100 text-green-800",
    bezet: "bg-red-100 text-red-800",
    gereserveerd: "bg-yellow-100 text-yellow-800",
    rekening: "bg-blue-100 text-blue-800",
    wachten: "bg-orange-100 text-orange-800",
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const status = (form.elements.namedItem("status") as HTMLSelectElement)
      .value as Table["status"];

    const newTable: Table = {
      id: tables.length + 1,
      name,
      status,
    };

    setTables([...tables, newTable]);
    form.reset();
    setShowForm(false);
  };

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#0a3c6e]">Tafels</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[#12395B] hover:text-[#0a2e4a] p-2 rounded-full hover:bg-[#e6f0fa]"
          title="Nieuwe tafel toevoegen"
        >
          +
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
            defaultValue="leeg"
          >
            <option value="leeg">Leeg</option>
            <option value="bezet">Bezet</option>
            <option value="gereserveerd">Gereserveerd</option>
            <option value="rekening">Open rekening</option>
            <option value="wachten">Wacht op bestelling</option>
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
            className="bg-white p-4 rounded shadow flex justify-between items-center"
          >
            <span className="text-[#0a3c6e] font-semibold">{table.name}</span>
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                statusColor[table.status]
              }`}
            >
              {statusLabels[table.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
