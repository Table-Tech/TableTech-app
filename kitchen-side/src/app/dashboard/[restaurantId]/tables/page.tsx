'use client'

import { useParams } from 'next/navigation';
import { mockTables, Table } from '@/lib/mockdata';

export default function TablesPage() {
  const { restaurantId } = useParams() as { restaurantId: string };
  const tables: Table[] = mockTables[restaurantId] ?? [];

  const statusLabels: Record<Table['status'], string> = {
    leeg: '🟢 Leeg',
    bezet: '🔴 Bezet',
    gereserveerd: '🟠 Gereserveerd',
    rekening: '💳 Open rekening',
    wachten: '⏳ Wacht op bestelling',
  };

  const statusColor: Record<Table['status'], string> = {
    leeg: 'bg-green-100 text-green-800',
    bezet: 'bg-red-100 text-red-800',
    gereserveerd: 'bg-yellow-100 text-yellow-800',
    rekening: 'bg-blue-100 text-blue-800',
    wachten: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#0a3c6e] mb-6">Tafels</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-white p-4 rounded shadow flex justify-between items-center"
          >
            <span className="text-[#0a3c6e] font-semibold">{table.name}</span>
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[table.status]}`}
            >
              {statusLabels[table.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}