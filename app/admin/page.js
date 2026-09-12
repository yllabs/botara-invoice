"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          pin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid login.");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Unable to connect to the server.");
      setLoading(false);
    }
  }

  return (
    <main className="adminLoginPage">
      <div className="adminGlow adminGlowOne" />
      <div className="adminGlow adminGlowTwo" />

      <div className="adminLoginCard">
        <div className="adminBrand">
          DROP<span>FITS</span>
        </div>

        <div className="adminBadge">
          ADMIN PANEL
        </div>

        <h1>Welcome back.</h1>

        <p className="adminSubtitle">
          Sign in to manage your DropFits marketplace.
        </p>

        <form onSubmit={handleLogin}>
          <label>
            Admin Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter admin name"
            autoComplete="username"
            required
          />

          <label>
            PIN
          </label>

          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            inputMode="numeric"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="adminError">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="adminLoginButton"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <a href="/" className="backHome">
          ← Back to DropFits
        </a>
      </div>
    </main>
  );
}
