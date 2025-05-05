'use client'

import { mockRestaurants } from "../../lib/mockdata";
import { useRouter } from "next/navigation";

export default function SelectPage() {
  const router = useRouter();

  return (
    <div className="p-8 min-h-screen bg-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Selecteer een Restaurant</h1>
      <div className="flex gap-6 flex-wrap justify-center">
        {mockRestaurants.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/dashboard/${r.id}`)}
            className="bg-white hover:bg-gray-100 p-4 rounded-xl shadow w-60 text-center"
          >
            <img src={r.logo} alt={r.name} className="w-20 h-20 mx-auto mb-3 object-contain" />
            <p className="font-semibold text-[#12395B]">{r.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}