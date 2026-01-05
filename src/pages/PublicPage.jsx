import { useState, useMemo, useEffect, useRef } from "react";
import { FaDiscord } from "react-icons/fa";
import { SiRoblox } from "react-icons/si";
import MessageCard from "./MessageCard";
import { supabase } from "../lib/supabase";


export default function App() {
    // OWNER
    const ownerName = "Miyubi0_0";
    const ownerUsername = "ceunah0_0";
    const ownerTag = "They/Was";
    const MAX_NAME = 20;
    const MAX_MESSAGE = 100;
    const COOLDOWN_SECONDS = 10;
    const ROBLOX_PROFILE_URL = "https://www.roblox.com/id/users/7705382131/profile";
    const DISCORD_PROFILE_URL = "https://discord.com/users/1027921201194082425";
    const topRef = useRef(null);
    const messagesRef = useRef(null);


    // SENDER
    const [user, setUser] = useState(null);
    const isOwner = !!user;
    const [sessionId, setSessionId] = useState(null);
    const [senderName, setSenderName] = useState("");
    const [anon, setAnon] = useState(false);
    const [message, setMessage] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [showMessages, setShowMessages] = useState(false);

    const [rows, setRows] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        let sid = localStorage.getItem("anon_session_id");

        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem("anon_session_id", sid);
        }

        setSessionId(sid);
    }, []);

    useEffect(() => {
        fetchMessages();
    }, []);

    async function fetchMessages() {
        setLoadingMessages(true);

        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
        } else {
            setRows(data);
        }

        setLoadingMessages(false);
    }

    function buildThreads(data) {
        const map = {};
        const roots = [];

        // buat map
        data.forEach(m => {
            map[m.id] = {
                id: m.id,
                sender: m.sender_name,
                content: m.content,
                created_at: m.created_at,
                session_id: m.session_id,
                parent_id: m.parent_id,
                replies: []
            };
        });

        // cari root message untuk tiap item
        data.forEach(m => {
            if (!m.parent_id) {
                roots.push(map[m.id]);
            } else {
                let parent = map[m.parent_id];

                // 🔥 naik terus sampai ketemu root
                while (parent && parent.parent_id) {
                    parent = map[parent.parent_id];
                }

                // sekarang parent adalah root
                parent?.replies.push(map[m.id]);
            }
        });

        // urutkan reply
        roots.forEach(r => {
            r.replies.sort(
                (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
        });

        return roots;
    }

    const messages = useMemo(
        () => buildThreads(rows),
        [rows]
    );


    function toggleAnon(value) {
        setAnon(value);
        setSenderName(value ? "Anonymous" : "");
        setError("");
    }

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((c) => c - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    async function send() {
        setError("");
        setSuccess(false);

        if (!sessionId) {
            setError("Session belum siap, refresh halaman.");
            return;
        }

        if (cooldown > 0) {
            setError(`Tunggu ${cooldown} detik sebelum mengirim lagi.`);
            return;
        }

        if (!isOwner && !anon && !senderName.trim()) {
            setError("Isi nama atau aktifkan mode anonim.");
            return;
        }

        if (!message.trim()) {
            setError("Pesan tidak boleh kosong.");
            return;
        }

        setLoading(true);

        // 🔑 IDENTITAS PENGIRIM
        const sender_name = isOwner
            ? ownerName
            : anon
                ? "Anonymous"
                : senderName;

        const messageSessionId = isOwner ? null : sessionId;

        // 🔥 INSERT KE SUPABASE
        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_name,
                content: message,
                parent_id: null,
                session_id: messageSessionId
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            setError("Gagal mengirim pesan.");
            setLoading(false);
            return;
        }

        setRows(prev => [...prev, data]);

        await fetch("/api/discord", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "message",
                sender: sender_name,
                content: message
            })
        });

        setMessage("");
        setSenderName("");
        setSuccess(true);
        setCooldown(COOLDOWN_SECONDS);

        setTimeout(() => setSuccess(false), 3000);
        setLoading(false);
    }

    function findRootMessage(messageId) {
        let current = rows.find(m => m.id === messageId);

        while (current && current.parent_id) {
            current = rows.find(m => m.id === current.parent_id);
        }

        return current;
    }

    function findRootMessage(messageId) {
        let current = rows.find(m => m.id === messageId);

        while (current && current.parent_id) {
            current = rows.find(m => m.id === current.parent_id);
        }

        return current;
    }

    async function handleReply(messageId, text, parentReplyId = null) {
        if (!sessionId) return;

        const root = findRootMessage(parentReplyId ?? messageId);

        const isMyThread = root?.session_id === sessionId;

        if (!isOwner && !isMyThread) {
            alert("Kamu hanya bisa membalas pesan milikmu sendiri.");
            return;
        }

        // 🔑 IDENTITAS PENGIRIM YANG BENAR
        const sender_name = isOwner
            ? ownerName
            : root?.sender_name || "Anonymous";

        const replySessionId = isOwner ? null : sessionId;

        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_name,
                content: text,
                parent_id: parentReplyId ?? messageId,
                session_id: replySessionId
            })
            .select()
            .single();

        if (!error) {
            setRows(prev => [...prev, data]);
        }

        await fetch("/api/discord", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "reply",
                sender: sender_name,
                content: text,
                repliedTo: root?.content?.slice(0, 100)
            })
        });
    }

    async function handleDelete(messageId) {
        if (!isOwner) return;
        if (!confirm("Hapus pesan ini?")) return;

        await supabase.from("messages").delete().eq("id", messageId);
        setRows(prev => prev.filter(m => m.id !== messageId));
    }

    async function handleDeleteReply(_, replyId) {
        if (!confirm("Hapus balasan ini?")) return;

        await supabase.from("messages").delete().eq("id", replyId);
        setRows(prev => prev.filter(m => m.id !== replyId));
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
        <div
            className="
            flex flex-col
            min-h-screen
            px-4
            items-center gap-6 relative
          "
        >

            {/* FLOATING SHAPES BACKGROUND */}
            <div
                className="
                bg-shapes
              "
            >
                {shapes.map((s, i) => (
                    <div
                        key={i}
                        style={{
                            left: `${s.left}%`,
                            animationDuration: `${s.duration}s`,
                            animationDelay: `${s.delay}s`,
                            transform: `translateX(${s.drift}px)`
                        }}
                        className={`
                        shape ${s.type}
                      `}
                    />
                ))}
            </div>

            {/* CARD */}
            {/* HERO ZONE (CENTER SPACE) */}
            <div
                ref={topRef}
                className="
                flex
                w-full
                pt-24 pb-1
                justify-center
                md:pt-32 md:pb-1
              "
            >

                <div
                    className="
                    w-full max-w-md
                    p-[3px]
                    rounded-2xl
                    animate-border-rotate
                    card-wrapper relative
                  "
                >
                    <div
                        className="
                        overflow-hidden
                        bg-gradient-to-b from-white to-[#B4B6F6]
                        rounded-2xl
                      "
                    >

                        {/* BANNER + AVATAR */}
                        <div
                            className="
                            relative
                          "
                        >
                            <img
                                src="/banner.gif"
                                alt="banner"
                                className="
                                object-cover
                                w-full h-32
                              "
                            />

                            {/* AVATAR (NAIK KE BANNER) */}
                            <img
                                src="/avatar.gif"
                                alt="avatar"
                                className="
                                w-28 h-28
                                bg-white
                                rounded-full border-4 border-white
                                shadow-lg
                                absolute -bottom-10 left-6
                              "
                            />
                        </div>

                        {/* PROFILE TEXT */}
                        <div
                            className="
                            flex
                            px-6 pt-16
                            items-start gap-4
                          "
                        >
                            <div>
                                <div
                                    className="
                                    flex
                                    items-center gap-2
                                  "
                                >
                                    <p
                                        style={{ fontFamily: "'Press Start 2P', cursive" }}
                                        className="
                                        text-lg text-purple-600 font-bold
                                        animate-owner-float
                                        drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]
                                      "
                                    >
                                        {ownerName}
                                    </p>

                                    {/* ROBLOX ICON */}
                                    <a
                                        href={ROBLOX_PROFILE_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Roblox Profile"
                                        className="
                                        flex
                                        w-5 h-5
                                        bg-[#325DF8]
                                        rounded-[3px]
                                        animate-owner-float
                                        items-center justify-center hover:scale-110 transition
                                      "
                                    >
                                        <SiRoblox
                                            className="
                                            w-3.5 h-3.5
                                            text-white
                                          "
                                        />
                                    </a>

                                </div>


                                <div
                                    className="
                                    flex
                                    mt-1
                                    animate-owner-float
                                    items-center gap-2
                                  "
                                >
                                    <p
                                        className="
                                        text-sm text-gray-500
                                      "
                                    >
                                        @{ownerUsername} • {ownerTag}
                                    </p>

                                    {/* DISCORD ICON */}
                                    <a
                                        href={DISCORD_PROFILE_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Discord"
                                    >
                                        <FaDiscord
                                            className="
                                            w-3.5 h-3.5
                                            text-[#5865F2]
                                            opacity-80
                                            hover:opacity-100 hover:scale-110 transition
                                          "
                                        />
                                    </a>
                                </div>

                            </div>
                        </div>


                        {/* CONTENT */}
                        <div
                            className="
                            px-6 pt-6 pb-6
                          "
                        >
                            <h1
                                className="
                                mb-1 mt-2
                                text-sm font-medium text-purple-600
                              "
                            >
                                Send Message?
                            </h1>

                            <div
                                className="
                                mb-3
                                relative
                              "
                            >
                                <input
                                    type="text"
                                    placeholder="Nama anda"
                                    value={senderName}
                                    disabled={anon}
                                    maxLength={MAX_NAME}
                                    onChange={(e) => {
                                        setSenderName(e.target.value);
                                        setError("");
                                    }}
                                    className={`
                                    w-full
                                    p-3
                                    rounded-lg border border-purple-400
                                    focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-300
                                    ${anon ? "bg-gray-100 text-gray-500" : ""}
                                  `}
                                />

                                {/* COUNTER */}
                                {!anon && (
                                    <span
                                        className={`
                                        text-xs
                                        absolute bottom-1 right-2
                                        ${senderName.length >= MAX_NAME
                                                ? "text-red-500"
                                                : senderName.length > MAX_NAME - 5
                                                    ? "text-yellow-500"
                                                    : "text-gray-400"}
                                      `}
                                    >
                                        {senderName.length}/{MAX_NAME}
                                    </span>
                                )}
                            </div>

                            <label
                                className="
                                flex
                                mb-4
                                text-sm
                                cursor-pointer
                                items-center gap-2
                              "
                            >
                                <input
                                    type="checkbox"
                                    checked={anon}
                                    disabled={isOwner}
                                    onChange={(e) => toggleAnon(e.target.checked)}
                                />
                                Kirim sebagai anonim
                            </label>

                            <div
                                className="
                                mb-3
                                relative
                              "
                            >
                                <textarea
                                    placeholder="Tulis pesan..."
                                    value={message}
                                    maxLength={MAX_MESSAGE}
                                    onChange={(e) => {
                                        setMessage(e.target.value);
                                        setError("");
                                    }}
                                    className="
                                    w-full h-28
                                    p-3 pb-7
                                    rounded-lg border border-purple-400
                                    resize-none
                                    focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-300
                                  "
                                />


                                {/* COUNTER */}
                                <span
                                    className={`
                                    text-xs
                                    pointer-events-none
                                    absolute bottom-3 right-2
                                    ${message.length >= MAX_MESSAGE
                                            ? "text-red-500"
                                            : message.length > MAX_MESSAGE - 20
                                                ? "text-yellow-500"
                                                : "text-gray-400"}
                                  `}
                                >
                                    {message.length}/{MAX_MESSAGE}
                                </span>

                            </div>

                            {/* ERROR POPUP */}
                            {error && (
                                <div
                                    className="
                                    mb-3
                                    error-popup
                                  "
                                >
                                    <span
                                        className="
                                        text-lg
                                      "
                                    >⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            {cooldown > 0 && (
                                <div
                                    className="
                                    mb-3
                                    text-xs text-yellow-600 text-center
                                  "
                                >
                                    ⏳ Kirim ulang dalam <b>{cooldown}</b> detik
                                </div>
                            )}

                            {success && (
                                <div
                                    className="
                                    mb-3
                                    success-popup
                                  "
                                >
                                    <span
                                        className="
                                        text-lg
                                      "
                                    >✅</span>
                                    <span>Pesan berhasil dikirim!</span>
                                </div>
                            )}

                            <button
                                onClick={send}
                                disabled={loading || cooldown > 0}
                                className="
                                w-full
                                py-3
                                text-white font-semibold
                                bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-700
                                rounded-lg
                                animate-gradient shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all
                                hover:shadow-[0_0_30px_rgba(168,85,247,0.9)] hover:-translate-y-[1px] duration-300 disabled:opacity-50 disabled:animate-none
                              "
                            >
                                {loading ? "Mengirim..." : "Kirim"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {!showMessages && (
                <div
                    className="
                    flex
                    mt-1
                    justify-center
                  "
                >
                    <button
                        onClick={() => {
                            setShowMessages(true);

                            setTimeout(() => {
                                messagesRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start"
                                });
                            }, 50);
                        }}
                        className="
                        text-sm text-purple-600 font-medium
                        animate-pulse
                        hover:underline
                      "
                    >
                        ✨ Lihat pesan
                    </button>
                </div>
            )}

            {/* MESSAGES */}
            {showMessages && (
                <div
                    ref={messagesRef}
                    className="
                    w-full max-w-md
                    mt-1 pb-24
                    md:max-w-4xl
                  "
                >

                    <div
                        className="
                        overflow-hidden
                        px-5 py-5
                        bg-gradient-to-b from-[#f9f7f5] to-[#B4B6F6]
                        rounded-2xl border
                        shadow-sm animate-border-rotate
                      "
                    >
                        {/* HEADER */}
                        <div
                            className="
                            flex
                            mb-6
                            items-center justify-between
                          "
                        >
                            <h2
                                className="
                                text-sm font-medium text-purple-600
                              "
                            >
                                💬 Messages
                            </h2>

                            <button
                                onClick={() => setShowMessages(false)}
                                className="
                                text-xs text-gray-400
                                hover:text-red-500
                              "
                            >
                                ✖ Tutup
                            </button>
                        </div>

                        {/* LIST */}
                        <div
                            className="
                            space-y-4
                          "
                        >
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

                        {/* BACK TO TOP */}
                        <div
                            className="
                            flex
                            mt-8
                            justify-center
                          "
                        >
                            <button
                                onClick={() => {
                                    setShowMessages(false);
                                    topRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="
                                text-xs text-purple-600
                                hover:underline
                              "
                            >
                                ⬆ Kembali ke atas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
