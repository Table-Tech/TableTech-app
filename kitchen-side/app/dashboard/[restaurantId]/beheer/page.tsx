'use client'

import { useParams } from 'next/navigation'
import { Label } from "../../../../components/label"
import { Switch } from "../../../../components/switch"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../../components/select"
import { StaffList } from "../../../../components/StaffList";
import React, { useState, useEffect } from 'react'
import MenuList from "../../../../components/MenuList";

// Voeg de Category type definitie toe
type Category = {
  id: string;
  name: string;
  restaurantId: string;
  // Voeg andere eigenschappen toe die je Category heeft
  items?: MenuItem[];
};

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  // Voeg andere eigenschappen toe die je MenuItem heeft
};

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// Voeg User type toe
type User = {
  email: string;
  role: string;
};

const API_URL = 'http://localhost:3001';

export default function BeheerPage() {
    const params = useParams()
    const restaurantId = params?.restaurantId as string
    const [staff, setStaff] = useState<StaffMember[]>([]);

    // Settings kunnen later via API opgehaald worden
    const settings = {
      name: '',
      email: '',
      kvk: '',
      phone: '',
      goLiveDate: '',
      active: false,
      logo: '',
    };
    
    const [activeTab, setActiveTab] = useState('General');
    const [menu, setMenu] = useState<Category[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(true);
    const [menuLoading, setMenuLoading] = useState(true);
    const currentUser: User = { email: "admin@restaurant1.com", role: "ADMIN" };

    useEffect(() => {
      // Staff ophalen
      const fetchStaff = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await fetch(`${API_URL}/api/orders?restaurantId=${restaurantId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (res.ok) {
            setStaff(data);
          } else {
            console.error('Fout bij ophalen van staff:', data);
          }
        } catch (err) {
          console.error('Netwerkfout:', err);
        }
      };
      
      // Menu ophalen
      const fetchMenu = async () => {
        setMenuLoading(true);
        try {
          const res = await fetch(`/api/menu?restaurantId=${restaurantId}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Menu ophalen mislukt');
          setMenu(json.data);
        } catch (err) {
          console.error('Fout bij menu ophalen:', err);
        } finally {
          setMenuLoading(false);
        }
      };
      
      // Categorieën ophalen
      const fetchCategories = async () => {
        setCategoryLoading(true);
        try {
          const res = await fetch(`/api/menu-categories?restaurantId=${restaurantId}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Categorieën ophalen mislukt');
          setCategories(json);
        } catch (err) {
          console.error('Fout bij categorieën ophalen:', err);
        } finally {
          setCategoryLoading(false);
        }
      };
      
      if (restaurantId) {
        fetchStaff();
        fetchMenu();
        fetchCategories();
      }
    }, [restaurantId]);

    // Functies voor categorie CRUD
    const handleAddCategory = async () => {
      const name = window.prompt('Naam van categorie:');
      if (!name) return;
      try {
        const res = await fetch('/api/menu-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, restaurantId }),
        });
        if (!res.ok) throw new Error('Toevoegen mislukt');
        await res.json();
        // Herladen
        setCategoryLoading(true);
        const cats = await fetch(`/api/menu-categories?restaurantId=${restaurantId}`).then(r => r.json());
        setCategories(cats);
        setCategoryLoading(false);
      } catch (err) {
        window.alert('Fout bij toevoegen categorie');
      }
    };

    const handleEditCategory = async (id: string) => {
      const name = window.prompt('Nieuwe naam voor categorie:');
      if (!name) return;
      try {
        const res = await fetch(`/api/menu-categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Bewerken mislukt');
        await res.json();
        // Herladen
        setCategoryLoading(true);
        const cats = await fetch(`/api/menu-categories?restaurantId=${restaurantId}`).then(r => r.json());
        setCategories(cats);
        setCategoryLoading(false);
      } catch (err) {
        window.alert('Fout bij bewerken categorie');
      }
    };

    const handleDeleteCategory = async (id: string) => {
      if (!window.confirm('Weet je zeker dat je deze categorie wilt verwijderen?')) return;
      try {
        const res = await fetch(`/api/menu-categories/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Verwijderen mislukt');
        // Herladen
        setCategoryLoading(true);
        const cats = await fetch(`/api/menu-categories?restaurantId=${restaurantId}`).then(r => r.json());
        setCategories(cats);
        setCategoryLoading(false);
      } catch (err) {
        window.alert('Fout bij verwijderen categorie');
      }
    };

    return (
        <div className="p-8 bg-[#f6fcff] min-h-screen">
          {/* Top bar with tabs and Save Changes button */}
          <h1 className="text-2xl font-bold text-[#12395B] mb-6">Beheer</h1>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {['General', 'Restaurant', 'Menu', 'Staff', 'Payment', 'Notifications'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded bg-white border border-[#e5e7eb] text-[#12395B] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-150 ring-0 ${activeTab === tab ? 'border-b-2 border-blue-500 bg-[#f8fafc] text-black' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded shadow transition-all duration-150">Save Changes</button>
          </div>

          {/* Tab content */}
          {activeTab === 'General' && (
            <>
              {/* Existing General content */}
              <section className="bg-white p-6 rounded shadow mb-6 text-gray-800">
                <h2 className="text-lg font-semibold mb-4">Organisatiegegevens</h2>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
                  <div className="flex flex-col">
                    <label htmlFor="name" className="text-sm font-medium mb-1">Bedrijfsnaam</label>
                    <input name="name" id="name" defaultValue={settings.name} className="border p-2 rounded" />
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="email" className="text-sm font-medium mb-1">E-mailadres</label>
                    <input name="email" id="email" defaultValue={settings.email} className="border p-2 rounded" />
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="kvk" className="text-sm font-medium mb-1">KVK-nummer</label>
                    <input name="kvk" id="kvk" defaultValue={settings.kvk} className="border p-2 rounded" />
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="phone" className="text-sm font-medium mb-1">Telefoonnummer</label>
                    <input name="phone" id="phone" defaultValue={settings.phone} className="border p-2 rounded" />
                  </div>

                  <div className="flex flex-col col-span-2">
                    <label htmlFor="goLive" className="text-sm font-medium mb-1">Go live datum</label>
                    <input name="goLive" id="goLive" type="date" defaultValue={settings.goLiveDate} className="border p-2 rounded" />
                  </div>

                  <div className="col-span-2">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" defaultChecked={settings.active} />
                      Actief
                    </label>
                  </div>
                </form>
              </section>
              <section className="bg-white p-6 rounded shadow text-gray-600 mb-6">
                <h2 className="text-lg font-semibold mb-4">Logo</h2>
                <img src={settings.logo} alt="Logo" className="h-24 mb-4" />
                <input type="file" accept="image/*" />
              </section>
              <section className="bg-white p-6 rounded shadow text-gray-800">
                <h2 className="text-lg font-semibold mb-4">Openingstijden</h2>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                  (day, index) => (
                    <div key={index} className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Switch id={`${day.toLowerCase()}-open`} defaultChecked={index < 6} />
                        <Label htmlFor={`${day.toLowerCase()}-open`} className="ml-2">
                          {day}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select defaultValue={index < 6 ? "09:00" : "closed"}>
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Opening" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="08:00">8:00 AM</SelectItem>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>to</span>
                        <Select defaultValue={index < 6 ? "22:00" : "closed"}>
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Closing" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="20:00">8:00 PM</SelectItem>
                            <SelectItem value="21:00">9:00 PM</SelectItem>
                            <SelectItem value="22:00">10:00 PM</SelectItem>
                            <SelectItem value="23:00">11:00 PM</SelectItem>
                            <SelectItem value="00:00">12:00 AM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ),
                )}
              </section>
            </>
          )}
          {activeTab === 'Restaurant' && (
            <section className="bg-white p-8 rounded shadow text-gray-800 max-w-3xl">
              <h2 className="text-2xl font-bold mb-2">Restaurant Settings</h2>
              <p className="text-gray-500 mb-2">Configure your restaurant settings</p>
              <p className="text-gray-400">Restaurant settings content would appear here</p>
            </section>
          )}
          {activeTab === 'Menu' && (
            <div className="bg-white p-8 rounded shadow text-gray-800 max-w-3xl">
              {menuLoading ? (
                <p>Menu laden...</p>
              ) : (
                <MenuList />
              )}
            </div>
          )}
          {activeTab === 'Staff' && (
            <section className="bg-white p-8 rounded shadow text-gray-800 max-w-3xl">
              <h2 className="text-2xl font-bold mb-4">Teamleden</h2>
              {staff.length > 0 ? (
                <StaffList staff={staff} />
              ) : (
                <p className="text-gray-500">Geen medewerkers gevonden.</p>
              )}
            </section>
          )}
          {activeTab === 'Payment' && (
            <section className="bg-white p-8 rounded shadow text-gray-800 max-w-3xl">
              <h2 className="text-2xl font-bold mb-2">Payment Settings</h2>
              <p className="text-gray-500 mb-2">Configure your payment settings</p>
              <p className="text-gray-400">Payment settings content would appear here</p>
            </section>
          )}
          {activeTab === 'Notifications' && (
            <section className="bg-white p-8 rounded shadow text-gray-800 max-w-3xl">
              <h2 className="text-2xl font-bold mb-2">Notification Settings</h2>
              <p className="text-gray-500 mb-2">Configure your notification settings</p>
              <p className="text-gray-400">Notification settings content would appear here</p>
            </section>
          )}
        </div>
      )
    }