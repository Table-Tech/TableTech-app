"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MenuItem from "./components/MenuItem";
import { mockOrganizationSettings } from "../../../lib/mockdata";

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;
  const restaurantId = "r1";
  const restaurantName = mockOrganizationSettings[restaurantId]?.name;

  const [cart, setCart] = useState<any[]>([]);
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});
  const [startTransition, setStartTransition] = useState(false);
  const [startEntryTransition, setStartEntryTransition] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // 👈 nieuw
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      const parsed = JSON.parse(stored);
      const filtered = parsed.filter((item: any) => item.quantity >= 1);
      setCart(filtered);
      localStorage.setItem("cart", JSON.stringify(filtered));
    }
    const timeout = setTimeout(() => setStartEntryTransition(false), 600);
    return () => clearTimeout(timeout);
  }, []);

  const handleAddToCart = (item: any, quantity: number) => {
    const existing = cart.find((i) => i.id === item.id);
    const newCart = existing
      ? cart.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
      )
      : [...cart, { ...item, quantity }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleGoToCart = () => {
    setStartTransition(true);
    setTimeout(() => router.push(`/client/${tableId}/cart`), 400);
  };

  const [menuData, setMenuData] = useState<Record<string, any[]> | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      const res = await fetch("http://192.168.2.12:3000/api/menu?r=r2");
      const data = await res.json();
      setMenuData(data);
    };
    fetchMenu();
  }, [[tableId]]);

  return (
    <>
      {/* 👨‍🍳 Vaste knop */}
      <div className="fixed top-5 right-5 z-50">
        <button
          onClick={() => setShowPopup(true)}
          className="bg-gray-100 text-black p-3 rounded-full shadow text-xl"
        >
          🧍
        </button>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-sm">
            <h2 className="text-lg font-bold mb-4">Maak een keuze</h2>

            <button
              onClick={() => {
                setShowPopup(false);
                alert("🧾 De rekening is aangevraagd.");
              }}
              className="w-full bg-purple-700 text-white py-3 rounded mb-3"
            >
              🧾 Vraag de rekening
            </button>

            <button
              onClick={() => {
                setShowPopup(false);
                alert("🙋 Een ober is onderweg.");
              }}
              className="w-full bg-gray-800 text-white py-3 rounded mb-3"
            >
              🙋 Vraag om een ober
            </button>

            <button
              onClick={() => setShowPopup(false)}
              className="w-full text-gray-600 underline"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

      {!startEntryTransition && (
        <motion.main
          key="clientMain"
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="p-4 max-w-md mx-auto pb-40 space-y-4 bg-white min-h-screen"
        >
          <h1 className="text-2xl font-bold mb-6 text-center">Menu Kaart</h1>
          <h2 className="text-center text-sm text-gray-600 mt-2 mb-1">
            {restaurantName} – Tafel {tableId}
          </h2>

          {menuData && Object.entries(menuData).map(([category, items]) => (
            <div key={category} className="border-b-2 border-gray-300 pb-3">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full text-left text-xl font-bold py-3 flex justify-between items-center"
              >
                {category}
                <span className="text-sm">{openCategories[category] ? "▲" : "▼"}</span>
              </button>

              <AnimatePresence initial={false}>
                {openCategories[category] && (
                  <motion.div
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    <div className="space-y-4 mt-2">
                      {items.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{
                            delay: index * 0.05,
                            duration: 0.3,
                            ease: "easeOut",
                          }}
                        >
                          <MenuItem item={item} onAdd={handleAddToCart} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.main>
      )}

      {cart.length > 0 && !startEntryTransition && (
        <motion.footer
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
          onAnimationComplete={() => setFooterVisible(true)}
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 px-4 py-4"
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={handleGoToCart}
              className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition text-center text-lg"
            >

              🛍️ Bekijk bestelling ({totalItems} items – €{total.toFixed(2)})
            </button>
          </div>
        </motion.footer>
      )}

      {startTransition && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 bg-white"
        >
          <div className="h-full flex items-center justify-center">
            <p className="text-xl font-bold animate-pulse">Laden...</p>
          </div>
        </motion.div>
      )}
    </>
  );
}
