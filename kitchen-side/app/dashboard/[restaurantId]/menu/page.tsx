"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { mockMenuItems, MenuItem } from "lib/mockdata";
import { Plus } from "lucide-react";
import { MenuList } from "../../../../components/MenuList";

const currentUser = {
  email: "admin@restaurant1.com",
  role: "ADMIN",
};

export default function MenuPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;
  const [menu, setMenu] = useState<MenuItem[]>(
    mockMenuItems[restaurantId] || []
  );
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const description = (
      form.elements.namedItem("description") as HTMLInputElement
    ).value;
    const price = parseFloat(
      (form.elements.namedItem("price") as HTMLInputElement).value
    );
    const image = (form.elements.namedItem("image") as HTMLInputElement).value;

    const newItem: MenuItem = {
      id: `m${menu.length + 1}`,
      title,
      description,
      price,
      image,
    };

    setMenu([...menu, newItem]);
    form.reset();
    setShowForm(false);
  };

  const groupedMenu = menu.reduce((acc, item) => {
    const category = item.category || "Overig";
    acc[category] = [...(acc[category] || []), item];
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <MenuList menu={menu} setMenu={setMenu} canAdd={false} currentUser={currentUser} />
    </div>
  );
}
