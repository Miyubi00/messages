import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// Komponen & Hook yang sudah dipisah
import { OWNER, CONFIG } from "../utils/constants";
import { useMessages } from "../hooks/useMessages";
import MessageCard from "./MessageCard"; // Pastikan path ini benar
import BackgroundShapes from "../components/BackgroundShapes";
import ProfileHeader from "../components/ProfileHeader";
import WebsitePopup from "../components/WebsitePopup";

export default function PublicPage() {
    const topRef = useRef(null);
    const messagesRef = useRef(null);

    // STATE AUTH & UI
    const [user, setUser] = useState(null);
    const isOwner = !!user;
    const [sessionId, setSessionId] = useState(null);
    const [showMessages, setShowMessages] = useState(false);
    const [showWebPopup, setShowWebPopup] = useState(false);

    // STATE FORM
    const [senderName, setSenderName] = useState("");
    const [anon, setAnon] = useState(false);
    const [message, setMessage] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [spotifyLink, setSpotifyLink] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Ambil logika database dari Custom Hook
    const {
        messages, unreadCount, send,
        handleReply, handleDelete, handleDeleteReply
    } = useMessages(sessionId, isOwner, OWNER.name);

    useEffect(() => {
        // 1. Logika session ID anonim
        let sid = localStorage.getItem("anon_session_id");
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem("anon_session_id", sid);
        }
        setSessionId(sid);

        // 2. Logika cek login Supabase
        supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // 3. LOGIKA BARU: TARIK DATA SPOTIFY DARI DATABASE
        async function fetchSettings() {
            const { data, error } = await supabase
                .from('settings')
                .select('spotify_url')
                .limit(1)
                .single();

            if (error) {
                console.error("Gagal mengambil lagu:", error.message);
            } else if (data && data.spotify_url) {
                setSpotifyLink(data.spotify_url);
            }
        }

        fetchSettings();

        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    function toggleAnon(value) {
        setAnon(value);
        setSenderName(value ? "Anonymous" : "");
        setError("");
    }

    async function handleSendClick() {
        setError("");
        if (!sessionId) return setError("Session belum siap, refresh halaman.");
        if (cooldown > 0) return setError(`Tunggu ${cooldown} detik sebelum mengirim lagi.`);
        if (!isOwner && !anon && !senderName.trim()) return setError("Isi nama atau aktifkan mode anonim.");
        // Boleh ngirim pesan kosong ASALKAN ada gambarnya
        if (!message.trim() && !imageFile) return setError("Pesan atau gambar tidak boleh kosong.");

        setLoading(true);
        try {
            let uploadedImageUrl = null;

            // PROSES UPLOAD GAMBAR KE SUPABASE STORAGE
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error("Gagal mengupload gambar.");

                // Dapatkan link public-nya
                const { data: publicUrlData } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName);

                uploadedImageUrl = publicUrlData.publicUrl;
            }

            // Kirim pesan + link gambar ke fungsi send
            await send(senderName, message, anon, uploadedImageUrl);

            // Bersihkan form
            setMessage("");
            setSenderName(anon ? "Anonymous" : "");
            setImageFile(null);
            setImagePreview(null);
            setSuccess(true);
            setCooldown(CONFIG.COOLDOWN_SECONDS);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message || "Gagal mengirim pesan.");
        } finally {
            setLoading(false);
        }
    }

    // FUNGSI UNTUK MEMILIH GAMBAR
    function handleImageChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validasi 2MB (2 * 1024 * 1024 bytes)
        if (file.size > 2 * 1024 * 1024) {
            setError("Ukuran gambar maksimal 2MB!");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError("");
    }

    return (
        <div className="flex flex-col min-h-screen px-4 items-center gap-6 relative">

            <BackgroundShapes />

            <div ref={topRef} className="flex w-full pt-24 pb-1 justify-center md:pt-32 md:pb-1">
                <div className="w-full max-w-md p-[3px] rounded-2xl animate-border-rotate card-wrapper relative">
                    <div className="overflow-hidden bg-gradient-to-b from-white to-[#B4B6F6] rounded-2xl">

                        {/* INI DIA PERBAIKANNYA: Menambahkan spotifyUrl={spotifyLink} */}
                        <ProfileHeader
                            onOpenWebsites={() => setShowWebPopup(true)}
                            spotifyUrl={spotifyLink}
                        />

                        {/* CONTENT FORM */}
                        <div className="px-6 pt-6 pb-6">
                            <h1 className="mb-1 mt-2 text-sm font-medium text-purple-600">Send Message?</h1>

                            {/* Input Nama */}
                            <div className="mb-3 relative">
                                <input
                                    type="text"
                                    placeholder="Nama anda"
                                    value={senderName}
                                    disabled={anon}
                                    maxLength={CONFIG.MAX_NAME}
                                    onChange={(e) => {
                                        setSenderName(e.target.value);
                                        setError("");
                                    }}
                                    className={`w-full p-3 rounded-lg border border-purple-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-300 ${anon ? "bg-gray-100 text-gray-500" : ""}`}
                                />
                                {!anon && (
                                    <span className={`text-xs absolute bottom-1 right-2 ${senderName.length >= CONFIG.MAX_NAME ? "text-red-500" : senderName.length > CONFIG.MAX_NAME - 5 ? "text-yellow-500" : "text-gray-400"}`}>
                                        {senderName.length}/{CONFIG.MAX_NAME}
                                    </span>
                                )}
                            </div>

                            {/* Checkbox Anonim */}
                            <label className="flex mb-4 text-sm cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={anon}
                                    disabled={isOwner}
                                    onChange={(e) => toggleAnon(e.target.checked)}
                                />
                                Kirim sebagai anonim
                            </label>

                            {/* AREA INPUT PESAN & GAMBAR (UNIFIED UI) */}
                            <div className="mb-4 flex flex-col relative w-full rounded-xl border border-purple-400 bg-white p-3 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-300 transition-all">

                                {/* Icon Upload (Hanya muncul di pojok kanan atas jika belum ada gambar) */}
                                {!imagePreview && (
                                    <label className="absolute top-3 right-3 cursor-pointer text-gray-600 hover:text-purple-600 transition-colors z-10" title="Tambahkan Gambar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21 15 16 10 5 21"></polyline>
                                            <line x1="16" y1="5" x2="22" y2="5"></line>
                                            <line x1="19" y1="2" x2="19" y2="8"></line>
                                        </svg>
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg, image/gif, image/webp"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                )}

                                {/* Header: Preview Gambar (Muncul di kiri atas jika ada gambar) */}
                                {imagePreview && (
                                    <div className="relative mb-3 w-16 h-16 shrink-0 animate-fade-in">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-full object-cover rounded-xl border border-purple-200 shadow-sm"
                                        />
                                        <button
                                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:bg-red-600 shadow-md transition-transform active:scale-90"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                {/* Textarea Pesan yang Transparan */}
                                <textarea
                                    placeholder="Tulis pesan..."
                                    value={message}
                                    maxLength={CONFIG.MAX_MESSAGE}
                                    onChange={(e) => {
                                        setMessage(e.target.value);
                                        setError("");
                                    }}
                                    className={`w-full min-h-[80px] resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 ${!imagePreview ? 'pr-8' : ''}`}
                                />

                                {/* Counter di Pojok Kanan Bawah */}
                                <div className="text-right mt-1">
                                    <span className={`text-xs font-medium tracking-wide ${message.length >= CONFIG.MAX_MESSAGE ? "text-red-500" : message.length > CONFIG.MAX_MESSAGE - 20 ? "text-yellow-500" : "text-gray-400"}`}>
                                        {message.length}/{CONFIG.MAX_MESSAGE}
                                    </span>
                                </div>
                            </div>

                            {/* Error & Success Notification */}
                            {error && (
                                <div className="mb-3 error-popup">
                                    <span className="text-lg">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            {cooldown > 0 && (
                                <div className="mb-3 text-xs text-yellow-600 text-center">
                                    ⏳ Kirim ulang dalam <b>{cooldown}</b> detik
                                </div>
                            )}

                            {success && (
                                <div className="mb-3 success-popup">
                                    <span className="text-lg">✅</span>
                                    <span>Pesan berhasil dikirim!</span>
                                </div>
                            )}

                            {/* Tombol Kirim */}
                            <button
                                onClick={handleSendClick}
                                disabled={loading || cooldown > 0}
                                className="w-full py-3 text-white font-semibold bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-700 rounded-lg animate-gradient shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.9)] hover:-translate-y-[1px] duration-300 disabled:opacity-50 disabled:animate-none"
                            >
                                {loading ? "Mengirim..." : "Kirim"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BUTTON LIHAT PESAN */}
            {!showMessages && (
                <div className="flex mt-1 justify-center">
                    <button
                        onClick={async () => {
                            setShowMessages(true);
                            setTimeout(() => {
                                messagesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 50);
                        }}
                        className="text-sm text-purple-600 font-medium animate-pulse hover:underline"
                    >
                        {unreadCount > 0 ? `🔴 ${unreadCount} pesan baru!` : "✨ Lihat pesan"}
                    </button>
                </div>
            )}

            {/* MESSAGE LIST */}
            {showMessages && (
                <div ref={messagesRef} className="w-full max-w-md mt-1 pb-24 md:max-w-4xl">
                    <div className="overflow-hidden px-5 py-5 bg-gradient-to-b from-[#f9f7f5] to-[#B4B6F6] rounded-2xl border shadow-sm animate-border-rotate">
                        <div className="flex mb-6 items-center justify-between">
                            <h2 className="text-sm font-medium text-purple-600">💬 Messages</h2>
                            <button onClick={() => setShowMessages(false)} className="text-xs text-gray-400 hover:text-red-500">
                                ✖ Tutup
                            </button>
                        </div>

                        <div className="space-y-4">
                            {messages.map(msg => (
                                <MessageCard
                                    key={msg.id}
                                    data={msg}
                                    isOwner={isOwner}
                                    sessionId={sessionId}
                                    onReply={handleReply}
                                    onDelete={handleDelete}
                                    onDeleteReply={handleDeleteReply}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showWebPopup && <WebsitePopup onClose={() => setShowWebPopup(false)} />}
        </div>
    );
}