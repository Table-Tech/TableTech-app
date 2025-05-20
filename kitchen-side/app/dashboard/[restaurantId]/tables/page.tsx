"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { mockTables, Table } from "lib/mockdata";

export default function TablesPage() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const [tables, setTables] = useState<Table[]>(mockTables[restaurantId] ?? []);
  const [showForm, setShowForm] = useState(false);

  const statusLabels: Record<Table["status"], string> = {
    beschikbaar: "🟢 beschikbaar",
    bezet: "🔴 Bezet",
    gereserveerd: "🟠 Gereserveerd",
    rekening: "💳 Open rekening",
    wachten: "⏳ Wacht op bestelling",
    schoonmaken: "🧹 Schoonmaken",
  };

  const statusColor: Record<Table["status"], string> = {
    beschikbaar: "bg-green-100 text-green-800",
    bezet: "bg-red-100 text-red-800",
    gereserveerd: "bg-yellow-100 text-yellow-800",
    rekening: "bg-blue-100 text-blue-800",
    wachten: "bg-orange-100 text-orange-800",
    schoonmaken: "bg-gray-200 text-gray-800",
  };

  const statusStyles: Record<Table["status"], { border: string; badge: string; label: string }> = {
    beschikbaar: { border: "border-green-500", badge: "bg-green-100 text-green-800", label: "Beschikbaar" },
    bezet: { border: "border-orange-500", badge: "bg-orange-100 text-orange-800", label: "Bezet" },
    gereserveerd: { border: "border-blue-500", badge: "bg-blue-100 text-blue-800", label: "Gereserveerd" },
    rekening: { border: "border-yellow-500", badge: "bg-yellow-100 text-yellow-800", label: "Open rekening" },
    wachten: { border: "border-gray-400", badge: "bg-gray-100 text-gray-800", label: "Wacht op bestelling" },
    schoonmaken: { border: "border-gray-500", badge: "bg-gray-200 text-gray-800", label: "Schoonmaken" },
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
            defaultValue="beschikbaar"
          >
            <option value="beschikbaar">beschikbaar</option>
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
        {tables.map((table) => {
          const style = statusStyles[table.status];
          return (
            <div
              key={table.id}
              className={`bg-white rounded shadow border-t-4 ${style.border} flex flex-col p-0`}
            >
              <div className="flex justify-between items-center px-4 pt-3 pb-1">
                <span className="text-lg font-semibold text-[#0a3c6e]">{table.name}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${style.badge}`}>{style.label}</span>
              </div>
              <div className="px-4 py-2 flex-1">
                {style.label === "Gereserveerd" ? (
                  <>
                    {table.guests && <div className="mb-2 text-sm text-gray-800">👥 {table.guests} gasten</div>}
                    {table.reservationTime && <div className="mb-2 text-sm text-gray-800">Gereserveerd voor {table.reservationTime}</div>}
                  </>
                ) : style.label === "Schoonmaken" ? (
                  <div className="mb-2 text-sm text-gray-800">🧹 Schoonmaken: {table.time ? `${table.time} min resterend` : "-"}</div>
                ) : style.label === "Beschikbaar" ? (
                  <div className="mb-2 text-sm text-gray-800">Deze tafel is beschikbaar voor een nieuwe gast</div>
                ) : style.label === "Open rekening" ? (
                  <div className="mb-2 text-sm text-gray-800">💳 Open rekening</div>
                ) : (
                  <>
                    {table.guests && <div className="mb-2 text-sm text-gray-800">👥 {table.guests} gasten</div>}
                    {table.time && <div className="mb-2 text-sm text-gray-800">⏱ {table.time} min</div>}
                    {table.orders && <div className="mb-2 text-sm text-gray-800">✔️ {table.orders} orders</div>}
                  </>
                )}
              </div>
              <div className="flex gap-2 px-4 pb-4">
                {/* Action buttons based on status */}
                {style.label === "Bezet" && (
                  <>
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-100">Details</button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">Order</button>
                  </>
                )}
                {style.label === "Gereserveerd" && (
                  <>
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-100">Annuleren</button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">Check In</button>
                  </>
                )}
                {style.label === "Beschikbaar" && (
                  <>
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-100">Reserveren</button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">Zet gasten neer</button>
                  </>
                )}
                {style.label === "Schoonmaken" && (
                  <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold">Markeer als beschikbaar</button>
                )}
                {style.label === "Open rekening" && (
                  <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-semibold">Close Check</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
