'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { mockMenuItems, MenuItem } from '@/lib/mockdata'
import { Plus } from 'lucide-react'

const currentUser = {
  email: 'admin@restaurant1.com',
  role: 'ADMIN',
}

export default function MenuPage() {
  const params = useParams()
  const restaurantId = params?.restaurantId as string
  const [menu, setMenu] = useState<MenuItem[]>(mockMenuItems[restaurantId] || [])
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value
    const description = (form.elements.namedItem('description') as HTMLInputElement).value
    const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value)
    const image = (form.elements.namedItem('image') as HTMLInputElement).value

    const newItem: MenuItem = {
      id: `m${menu.length + 1}`,
      title,
      description,
      price,
      image,
    }

    setMenu([...menu, newItem])
    form.reset()
    setShowForm(false)
  }

  const groupedMenu = menu.reduce((acc, item) => {
    const category = item.category || 'Overig'
    acc[category] = [...(acc[category] || []), item]
    return acc
  }, {} as Record<string, MenuItem[]>)  

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#12395B]">Menu</h1>

        {['ADMIN', 'SUPER'].includes(currentUser.role) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[#12395B] hover:text-[#0a2e4a] p-2 rounded-full hover:bg-[#e6f0fa]"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {Object.entries(groupedMenu).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-bold text-[#12395B] mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="p-4 bg-white shadow rounded-lg space-y-2">
                {item.image && (
                  <div className="w-full h-40 relative rounded overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="font-semibold text-[#12395B]">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                <p className="text-base font-bold text-gray-600">€{item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>  

      {showForm && (
        <form onSubmit={handleSubmit} className="max-w-md bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-lg font-semibold text-[#12395B]">Nieuw menu-item toevoegen</h2>
          <input
            name="title"
            placeholder="Naam gerecht"
            className="w-full border px-3 py-2 rounded text-gray-800"
            required
          />
          <input
            name="description"
            placeholder="Beschrijving"
            className="w-full border px-3 py-2 rounded text-gray-800"
            required
          />
          <input
            name="price"
            type="number"
            step="0.01"
            placeholder="Prijs (€)"
            className="w-full border px-3 py-2 rounded text-gray-800"
            required
          />
          <input
            name="image"
            placeholder="Afbeeldingspad (bijv. /margherita.jpg)"
            className="w-full border px-3 py-2 rounded text-gray-800"
            //required (voor testen ff uitgezet)
          />
          <button
            type="submit"
            className="bg-[#12395B] text-white px-4 py-2 rounded hover:bg-[#0a2e4a]"
          >
            Toevoegen
          </button>
        </form>
      )}
    </div>
  )
}
