'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockUsers } from "../../lib/mockdata";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    const user = mockUsers.find((u) => u.email === email);
    if (user) {
      localStorage.setItem("mockUser", JSON.stringify(user));
      if (user.role === "SUPER") {
        router.push("/select");
      } else {
        router.push(`/dashboard/${user.restaurantId}`);
      }
    } else {
      alert("User not found");
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-md p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-800"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-gray-700 hover:bg-gray-900 text-white py-2 rounded-md transition"
        >
          Login
        </button>

        <div className="text-right mt-3">
          <a href="#" className="text-sm text-blue-500 hover:underline">
            Wachtwoord vergeten?
          </a>
        </div>
      </div>
    </div>
  );
}
