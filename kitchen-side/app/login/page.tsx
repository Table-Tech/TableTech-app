"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3001";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Login mislukt: " + data.message);
        return;
      }

      const { token, staff } = data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("currentUser", JSON.stringify(staff));

      if (staff.role === "SUPER") {
        router.push("/select");
      } else {
        router.push(`/dashboard/${staff.restaurant.id}`);
      }
    } catch (err) {
      console.error("Login fout:", err);
      alert("Er ging iets mis tijdens het inloggen.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-md p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-md"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Wachtwoord"
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-md"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-gray-700 hover:bg-gray-900 text-white py-2 rounded-md transition"
        >
          Login
        </button>
      </div>
    </div>
  );
}
