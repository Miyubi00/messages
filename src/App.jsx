import { useState, useMemo } from "react";

export default function App() {
  // OWNER
  const ownerName = "Fuyumi0_0";
  const ownerUsername = "ceunah0_0";
  const ownerTag = "They/Was";

  // SENDER
  const [senderName, setSenderName] = useState("");
  const [anon, setAnon] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function toggleAnon(value) {
    setAnon(value);
    setSenderName(value ? "Anonymous" : "");
    setError("");
  }

  async function send() {
    setError("");
    setSuccess(false);

    if (!anon && !senderName.trim()) {
      setError("Isi nama atau aktifkan mode anonim.");
      return;
    }

    if (!message.trim()) {
      setError("Pesan tidak boleh kosong.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: anon ? "Anonymous" : senderName,
          message
        })
      });

      if (!res.ok) throw new Error("Gagal");

      setMessage("");
      setSenderName(anon ? "Anonymous" : "");
      setSuccess(true);

      // auto hide success
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError("Gagal mengirim pesan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const shapes = useMemo(() => {
    const types = ["circle", "square", "triangle", "cross"];

    return Array.from({ length: 70 }).map(() => {
      return {
        type: types[Math.floor(Math.random() * types.length)],
        left: Math.random() * 100,
        drift: Math.random() * 200 - 100,
        duration: Math.random() * 25 + 20,
        delay: Math.random() * -45
      };
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* FLOATING SHAPES BACKGROUND */}
      <div className="bg-shapes">
        {shapes.map((s, i) => (
          <div
            key={i}
            className={`shape ${s.type}`}
            style={{
              left: `${s.left}%`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              transform: `translateX(${s.drift}px)`
            }}
          />
        ))}
      </div>

      {/* CARD */}
      <div className="card-wrapper relative w-full max-w-md rounded-2xl p-[3px] animate-border-rotate">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-white to-[#B4B6F6]">

          {/* BANNER + AVATAR */}
          <div className="relative">
            <img
              src="/banner.gif"
              alt="banner"
              className="w-full h-32 object-cover"
            />

            {/* AVATAR (NAIK KE BANNER) */}
            <img
              src="/avatar.gif"
              alt="avatar"
              className="
    absolute
    -bottom-10
    left-6
    w-28 h-28
    rounded-full
    border-4 border-white
    bg-white
    shadow-lg
  "
            />
          </div>
          
          {/* PROFILE TEXT */}
          <div className="flex items-start gap-4 px-6 pt-16">
            <div>
              <div className="flex items-center gap-2">
                <p
                  className="
          text-sm
          text-purple-600
          font-bold
          drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]
          animate-owner-float
        "
                  style={{ fontFamily: "'Press Start 2P', cursive" }}
                >
                  {ownerName}
                </p>
              </div>

              <p className="text-xs text-gray-500 mt-1 animate-owner-float">
                @{ownerUsername} • {ownerTag}
              </p>
            </div>
          </div>


          {/* CONTENT */}
          <div className="px-6 pt-6 pb-6">
            <h1 className="text-base font-medium mb-2 mt-2 text-purple-600">
              Send Message?
            </h1>

            <input
              type="text"
              placeholder="Nama anda"
              value={senderName}
              disabled={anon}
              onChange={(e) => {
                setSenderName(e.target.value);
                setError("");
              }}
              className={`w-full mb-3 p-3 rounded-lg border border-purple-400
                focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-300
                ${anon ? "bg-gray-100 text-gray-500" : ""}`}
            />

            <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={anon}
                onChange={(e) => toggleAnon(e.target.checked)}
              />
              Kirim sebagai anonim
            </label>

            <textarea
              placeholder="Tulis pesan..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              className="w-full h-28 mb-3 p-3 rounded-lg resize-none
                border border-purple-400
                focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-300"
            />

            {/* ERROR POPUP */}
            {error && (
              <div className="error-popup mb-3">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-popup mb-3">
                <span className="text-lg">✅</span>
                <span>Pesan berhasil dikirim!</span>
              </div>
            )}

            <button
              onClick={send}
              disabled={loading}
              className="
                w-full py-3 rounded-lg
                bg-gradient-to-r from-purple-500 to-purple-700
                text-white font-semibold
                shadow-[0_0_20px_rgba(168,85,247,0.6)]
                hover:from-purple-600 hover:to-purple-800
                hover:-translate-y-[1px]
                transition-all
                disabled:opacity-50
              "
            >
              {loading ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
