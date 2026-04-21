// src/components/MessageCard.jsx
import { useState } from "react";
import { FaUserCircle, FaReply } from "react-icons/fa";
import { supabase } from "../lib/supabase";

const MAX_REPLY = 150;

function formatTime(date) {
    return new Date(date).toLocaleString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short"
    });
}

export default function MessageCard({
    data,
    isOwner,
    sessionId,
    onReply,
    onDelete,
    onDeleteReply
}) {
    const [replyingTo, setReplyingTo] = useState(null); // null | "message" | replyId
    const [replyText, setReplyText] = useState("");
    const [showReplies, setShowReplies] = useState(false);
    const [flashNotify, setFlashNotify] = useState(false);
    
    // STATE GAMBAR UNTUK REPLY
    const [replyImageFile, setReplyImageFile] = useState(null);
    const [replyImagePreview, setReplyImagePreview] = useState(null);
    const [isReplyingLoading, setIsReplyingLoading] = useState(false);
    const [replyError, setReplyError] = useState("");

    // STATE UNTUK ZOOM GAMBAR (Bisa dipakai buat gambar utama atau balasan)
    const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

    const isMyThread = data.session_id === sessionId;
    const canReplyThread = isOwner || isMyThread;

    function handleReplyImageChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setReplyError("Ukuran maksimal 2MB!");
            return;
        }

        setReplyImageFile(file);
        setReplyImagePreview(URL.createObjectURL(file));
        setReplyError("");
    }

    async function submitReply() {
        if (!replyText.trim() && !replyImageFile) {
            setReplyError("Pesan atau gambar tidak boleh kosong.");
            return;
        }

        setIsReplyingLoading(true);
        setReplyError("");

        try {
            let uploadedImageUrl = null;

            // Proses Upload Gambar Balasan ke Supabase
            if (replyImageFile) {
                const fileExt = replyImageFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, replyImageFile);

                if (uploadError) throw new Error("Gagal mengupload gambar.");

                const { data: publicUrlData } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName);

                uploadedImageUrl = publicUrlData.publicUrl;
            }

            // Kirim data ke fungsi handleReply di useMessages.js
            await onReply(
                data.id,
                replyText,
                replyingTo === "message" ? null : replyingTo,
                uploadedImageUrl
            );

            // Bersihkan form
            setReplyText("");
            setReplyingTo(null);
            setReplyImageFile(null);
            setReplyImagePreview(null);
        } catch (err) {
            setReplyError(err.message || "Gagal mengirim balasan.");
        } finally {
            setIsReplyingLoading(false);
        }
    }

    async function markThreadAsRead() {
        setFlashNotify(true);
        setTimeout(() => setFlashNotify(false), 2000);
        const ownerReplies = data.replies.filter(r => r.session_id === null);

        if (ownerReplies.length === 0) return;

        const latestTime = ownerReplies.reduce((max, r) =>
            new Date(r.created_at) > new Date(max) ? r.created_at : max,
            ownerReplies[0].created_at
        );

        const lastSeen = JSON.parse(localStorage.getItem("last_seen_time") || "{}");
        lastSeen[data.id] = latestTime;
        localStorage.setItem("last_seen_time", JSON.stringify(lastSeen));

        await supabase.from("messages").update({ is_unread: false }).eq("parent_id", data.id).eq("session_id", null);

        data.replies.forEach(r => { if (r.session_id === null) r.is_unread = false; });
        data.hasUnread = false;
    }

    return (
        <div className={`bg-white rounded-xl border shadow-sm p-4 space-y-4 ${(data.hasUnread || flashNotify) ? "ring-2 ring-red-300" : ""}`}>
            
            {/* ================= MODAL / POPUP GAMBAR FULLSCREEN ================= */}
            {zoomedImageUrl && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out animate-fade-in"
                    onClick={() => setZoomedImageUrl(null)}
                >
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white text-4xl font-bold">&times;</button>
                    <img 
                        src={zoomedImageUrl} 
                        alt="Zoomed Attachment" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}

            {/* ================= MAIN MESSAGE ================= */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        {data.hasUnread && <span title="Balasan baru" className="ml-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                        <FaUserCircle className="text-gray-400 text-lg" />
                        <span className="text-sm font-medium text-gray-800">{data.sender_name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(data.created_at)}</span>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all">{data.content}</p>

                {data.image_url && (
                    <div 
                        className="mt-3 overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-gray-50 cursor-zoom-in group relative"
                        onClick={() => setZoomedImageUrl(data.image_url)}
                    >
                        <img src={data.image_url} alt="attachment" className="w-full h-auto max-h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 bg-black/40 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-opacity">Lihat Gambar</span>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {canReplyThread && (
                        <button onClick={async () => { await markThreadAsRead(); setReplyingTo("message"); setShowReplies(true); }} className="hover:text-purple-600">Reply</button>
                    )}
                    {data.replies?.length > 0 && (
                        <button onClick={async () => { await markThreadAsRead(); setShowReplies(v => !v); }} className="text-purple-500 hover:underline">
                            {showReplies ? "Sembunyikan balasan" : `Lihat balasan (${data.replies.length})`}
                        </button>
                    )}
                    {isOwner && (
                        <button onClick={() => onDelete(data.id)} className="hover:text-red-500">Delete</button>
                    )}
                </div>
            </div>

            {/* ================= REPLIES ================= */}
            {showReplies && data.replies?.map(reply => {
                const isOwnerReply = reply.session_id === null;
                const repliedTo = reply.parent_id === data.id ? data : data.replies.find(r => r.id === reply.parent_id) || data;
                const canReplyReply = isOwner || isMyThread;

                return (
                    <div key={reply.id} className="border-t pt-3 space-y-1">
                        <div className="flex gap-2 text-xs text-gray-500">
                            <div className={`w-[2px] rounded-full ${isOwnerReply ? "bg-purple-300" : "bg-gray-300"}`} />
                            <div className="flex-1 min-w-0">
                                <div className={`flex items-center gap-1 ${isOwnerReply ? "text-purple-600" : "text-gray-500"}`}>
                                    <FaReply className="text-[10px]" />
                                    <span>Replying to <b>{repliedTo.sender_name}</b></span>
                                </div>
                                <div className="italic text-gray-400 truncate">
                                    “{repliedTo.content || (repliedTo.image_url ? "📷 Mengirim gambar" : "")}”
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <FaUserCircle className={`text-lg ${isOwnerReply ? "text-purple-500" : "text-gray-400"}`} />
                                    <span className={`text-sm font-medium ${isOwnerReply ? "text-purple-600" : "text-gray-700"}`}>{reply.sender_name}</span>
                                </div>
                                <span className="text-xs text-gray-400">{formatTime(reply.created_at)}</span>
                            </div>

                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all">{reply.content}</p>

                            {/* TAMPILAN GAMBAR DI DALAM BALASAN */}
                            {reply.image_url && (
                                <div 
                                    className="mt-2 w-3/4 overflow-hidden rounded-lg border border-gray-100 shadow-sm bg-gray-50 cursor-zoom-in group relative"
                                    onClick={() => setZoomedImageUrl(reply.image_url)}
                                >
                                    <img src={reply.image_url} alt="reply attachment" className="w-full h-auto max-h-48 object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
                                </div>
                            )}

                            <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                {canReplyReply && (
                                    <button onClick={() => { setReplyingTo(reply.id); setShowReplies(true); }} className="hover:text-purple-600">Reply</button>
                                )}
                                {isOwner && (
                                    <button onClick={() => onDeleteReply(data.id, reply.id)} className="hover:text-red-500">Delete</button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* ================= INLINE REPLY BOX (DENGAN FITUR GAMBAR) ================= */}
            {replyingTo && (
                <div className="relative pt-3 border-t">
                    <div className="flex flex-col relative w-full rounded-xl border border-purple-200 bg-white p-2 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-300 transition-all">
                        
                        {!replyImagePreview && (
                            <label className="absolute top-2 right-2 cursor-pointer text-gray-400 hover:text-purple-600 transition-colors z-10" title="Tambahkan Gambar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                    <line x1="16" y1="5" x2="22" y2="5"></line>
                                    <line x1="19" y1="2" x2="19" y2="8"></line>
                                </svg>
                                <input type="file" accept="image/png, image/jpeg, image/gif, image/webp" className="hidden" onChange={handleReplyImageChange} />
                            </label>
                        )}

                        {replyImagePreview && (
                            <div className="relative mb-2 w-14 h-14 shrink-0 animate-fade-in">
                                <img src={replyImagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg border border-purple-200 shadow-sm" />
                                <button onClick={() => { setReplyImageFile(null); setReplyImagePreview(null); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold hover:bg-red-600 shadow-md active:scale-90">✕</button>
                            </div>
                        )}

                        <textarea
                            placeholder="Tulis balasan..."
                            value={replyText}
                            maxLength={MAX_REPLY}
                            onChange={(e) => { setReplyText(e.target.value); setReplyError(""); }}
                            className={`w-full min-h-[60px] resize-none bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 ${!replyImagePreview ? 'pr-7' : ''}`}
                        />
                        
                        <div className="text-right mt-1">
                            <span className={`text-[10px] font-medium tracking-wide ${replyText.length >= MAX_REPLY ? "text-red-500" : replyText.length > MAX_REPLY - 20 ? "text-yellow-500" : "text-gray-400"}`}>
                                {replyText.length}/{MAX_REPLY}
                            </span>
                        </div>
                    </div>

                    {replyError && (
                        <div className="text-red-500 text-xs mt-1 font-medium">{replyError}</div>
                    )}

                    <div className="flex justify-end gap-3 mt-2 text-xs">
                        <button
                            onClick={() => { setReplyingTo(null); setReplyText(""); setReplyImageFile(null); setReplyImagePreview(null); setReplyError(""); }}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            disabled={isReplyingLoading}
                        >
                            Cancel
                        </button>

                        <button
                            disabled={(!replyText.trim() && !replyImageFile) || isReplyingLoading}
                            onClick={submitReply}
                            className="text-purple-600 font-medium disabled:opacity-40"
                        >
                            {isReplyingLoading ? "Uploading..." : "Send"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}