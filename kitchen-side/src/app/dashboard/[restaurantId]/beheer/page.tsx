'use client'

import { useParams } from 'next/navigation'
import { mockOrganizationSettings } from '@/lib/mockdata'

export default function BeheerPage() {
    const params = useParams()
    const restaurantId = params?.restaurantId as string
    const settings = mockOrganizationSettings[restaurantId]

    if (!settings) {
        return <p className="p-8">Geen gegevens gevonden.</p>
    }
    return (
        <div className="p-8 bg-[#f6fcff] min-h-screen">
          <h1 className="text-2xl font-bold text-[#12395B] mb-6">Beheer</h1>
    
          <section className="bg-white p-6 rounded shadow mb-6 text-gray-800">
            <h2 className="text-lg font-semibold mb-4">Organisatiegegevens</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
              <input name="name" defaultValue={settings.name} placeholder="Bedrijfsnaam" className="border p-2 rounded" />
              <input name="email" defaultValue={settings.email} placeholder="E-mailadres" className="border p-2 rounded" />
              <input name="kvk" defaultValue={settings.kvk} placeholder="KVK-nummer" className="border p-2 rounded" />
              <input name="phone" defaultValue={settings.phone} placeholder="Telefoonnummer" className="border p-2 rounded" />
              <input name="goLive" type="date" defaultValue={settings.goLiveDate} className="border p-2 rounded col-span-2" />
              <div className="col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" defaultChecked={settings.active} />
                  Actief
                </label>
              </div>
            </form>
          </section>
    
          <section className="bg-white p-6 rounded shadow text-gray-600">
            <h2 className="text-lg font-semibold mb-4">Logo</h2>
            <img src={settings.logo} alt="Logo" className="h-24 mb-4" />
            <input type="file" accept="image/*" />
          </section>
        </div>
      )
    }
  