import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  
  // State untuk Fitur Spotify
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [settingId, setSettingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();

  // Cek sesi saat pertama load
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });
  }, []);

  // Tarik data lagu dari Supabase JIKA admin sudah login
  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  async function fetchSettings() {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setSettingId(data.id);
      setSpotifyUrl(data.spotify_url || "");
    }
  }

  // Fungsi Login
  async function login(e) {
    e.preventDefault();
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Login gagal");
      return;
    }
    // Set user agar tampilan langsung berubah jadi dashboard tanpa harus refresh
    setUser(data.user);
  }

  // Fungsi Logout
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // Fungsi Simpan Lagu ke Database
  async function saveSpotifyUrl() {
    setIsSaving(true);
    
    try {
      if (settingId) {
        // Jika sudah ada data di database, kita UPDATE
        await supabase
          .from("settings")
          .update({ spotify_url: spotifyUrl })
          .eq("id", settingId);
      } else {
        // Jika tabel masih kosong melompong, kita INSERT data baru
        const { data } = await supabase
          .from("settings")
          .insert({ spotify_url: spotifyUrl })
          .select()
          .single();
          
        if (data) setSettingId(data.id);
      }
      alert("🎵 Lagu berhasil diperbarui! Silakan cek halaman depan.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan lagu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold mb-6 text-center text-gray-800">
          Admin Dashboard
        </h1>

        {!user ? (
          // === TAMPILAN JIKA BELUM LOGIN ===
          <form onSubmit={login} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button
              type="submit"
              className="w-full bg-purple-600 text-white rounded-lg py-2.5 font-medium hover:bg-purple-700 transition"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Kembali ke Beranda
            </button>
          </form>
        ) : (
          // === TAMPILAN JIKA SUDAH LOGIN ===
          <div className="space-y-6">
            <p className="text-sm text-gray-500 text-center bg-gray-100 py-2 rounded-lg">
              Halo, Admin! 👋
            </p>

            {/* Bagian Pengaturan Spotify */}
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="text-green-500">Spotify</span> Vibes Link
              </label>
              <input
                type="text"
                placeholder="Paste link lagu dari Spotify di sini..."
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-green-400 mb-3"
                value={spotifyUrl}
                onChange={e => setSpotifyUrl(e.target.value)}
              />
              <button
                onClick={saveSpotifyUrl}
                disabled={isSaving}
                className="w-full bg-green-500 text-white rounded-lg py-2 text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition"
              >
                {isSaving ? "Menyimpan..." : "Simpan Lagu"}
              </button>
              <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                *Tips: Buka Spotify (HP/PC) {'>'} Share {'>'} Copy Link, lalu paste di kotak ini. Kosongkan jika ingin mematikan fitur musik.
              </p>
            </div>

            {/* Bagian Bawah (Logout & Navigasi) */}
            <div className="border-t pt-4 flex justify-between items-center">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-purple-600 hover:underline font-medium"
              >
                Lihat Web ➡️
              </button>
              <button
                onClick={logout}
                className="text-red-500 text-sm hover:underline font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}