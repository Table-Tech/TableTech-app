'use client'

import { mockRestaurants } from "../../lib/mockdata";
import { useRouter } from "next/navigation";

export default function SelectRestaurantPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Select a Restaurant</h2>
      <ul>
        {mockRestaurants.map((r) => (
          <li
            key={r.id}
            className="cursor-pointer hover:underline"
            onClick={() => router.push(`/dashboard/${r.id}`)}
          >
            {r.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
