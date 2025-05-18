"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mockRestaurants as initialRestaurants } from "../../lib/mockdata";
import { Plus } from "lucide-react";

export default function SelectPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const logo = (form.elements.namedItem("logo") as HTMLInputElement).value;
    const newId = `r${restaurants.length + 1}`;

    setRestaurants([...restaurants, { id: newId, name, logo }]);
    form.reset();
    setShowForm(false);
  };

  return (
    <div className="p-8 min-h-screen bg-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Selecteer een Restaurant
      </h1>

      <div className="flex gap-6 flex-wrap justify-center">
        {restaurants.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/dashboard/${r.id}`)}
            className="bg-white hover:bg-gray-100 p-4 rounded-xl shadow w-60 text-center"
          >
            <img
              src={r.logo}
              alt={r.name}
              className="w-20 h-20 mx-auto mb-3 object-contain"
            />
            <p className="font-semibold text-[#12395B]">{r.name}</p>
          </button>
        ))}

        {/* Plus knop */}
        <button
          onClick={() => setShowForm(true)}
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:bg-gray-200 p-4 rounded-xl w-60 h-40 text-[#12395B]"
        >
          <Plus size={32} />
          <span className="mt-2 font-semibold">Nieuw restaurant</span>
        </button>
      </div>

      {/* Formulier */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 bg-white p-6 rounded shadow w-full max-w-md space-y-4"
        >
          <h2 className="text-lg font-semibold text-[#12395B]">
            Nieuw restaurant toevoegen
          </h2>
          <input
            name="name"
            placeholder="Naam restaurant"
            className="w-full border px-3 py-2 rounded text-gray-800"
            required
          />
          <input
            name="logo"
            placeholder="Logo pad (bijv. /logo.png)"
            className="w-full border px-3 py-2 rounded text-gray-800"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Annuleer
            </button>
            <button
              type="submit"
              className="bg-[#12395B] text-white px-4 py-2 rounded hover:bg-[#0a2e4a]"
            >
              Toevoegen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
