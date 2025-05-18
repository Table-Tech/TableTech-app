"use client";

import { useParams } from "next/navigation";
import { mockOrganizationSettings } from "lib/mockdata";

export default function BeheerPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  const defaultSettings = {
    name: "",
    email: "",
    kvk: "",
    phone: "",
    goLiveDate: "",
    active: false,
    logo: "",
  };

  const settings = mockOrganizationSettings[restaurantId] ?? defaultSettings;
  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <h1 className="text-2xl font-bold text-[#12395B] mb-6">Beheer</h1>

      <section className="bg-white p-6 rounded shadow mb-6 text-gray-800">
        <h2 className="text-lg font-semibold mb-4">Organisatiegegevens</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
          <div className="flex flex-col">
            <label htmlFor="name" className="text-sm font-medium mb-1">
              Bedrijfsnaam
            </label>
            <input
              name="name"
              id="name"
              defaultValue={settings.name}
              className="border p-2 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium mb-1">
              E-mailadres
            </label>
            <input
              name="email"
              id="email"
              defaultValue={settings.email}
              className="border p-2 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="kvk" className="text-sm font-medium mb-1">
              KVK-nummer
            </label>
            <input
              name="kvk"
              id="kvk"
              defaultValue={settings.kvk}
              className="border p-2 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="phone" className="text-sm font-medium mb-1">
              Telefoonnummer
            </label>
            <input
              name="phone"
              id="phone"
              defaultValue={settings.phone}
              className="border p-2 rounded"
            />
          </div>

          <div className="flex flex-col col-span-2">
            <label htmlFor="goLive" className="text-sm font-medium mb-1">
              Go live datum
            </label>
            <input
              name="goLive"
              id="goLive"
              type="date"
              defaultValue={settings.goLiveDate}
              className="border p-2 rounded"
            />
          </div>

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
  );
}
