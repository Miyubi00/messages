import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });
  }, []);

  async function login(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Login gagal");
      return;
    }

    navigate("/");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border rounded-xl p-6 shadow">
        <h1 className="text-lg font-semibold mb-4">
          Admin Login
        </h1>

        {!user ? (
          <form onSubmit={login} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full border rounded px-3 py-2"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button
              className="w-full bg-purple-600 text-white rounded py-2"
            >
              Login
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Login sebagai admin
            </p>
            <button
              onClick={logout}
              className="text-red-500 text-sm"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
