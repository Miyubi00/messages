// src/hooks/useMessages.js
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

// --- HELPER FUNCTION DI LUAR HOOK ---
function buildThreads(data, sessionId) {
    const map = {};
    const roots = [];

    data.forEach(m => {
        map[m.id] = {
            ...m,
            replies: []
        };
    });

    data.forEach(m => {
        if (!m.parent_id) {
            roots.push(map[m.id]);
        } else {
            let parent = map[m.parent_id];
            while (parent && parent.parent_id) {
                parent = map[parent.parent_id];
            }
            parent?.replies.push(map[m.id]);
        }
    });

    roots.forEach(r => {
        r.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    roots.forEach(r => {
        const lastSeen = JSON.parse(localStorage.getItem("last_seen_time") || "{}");
        r.hasUnread =
            r.session_id === sessionId &&
            r.replies.some(rep => {
                if (rep.session_id !== null) return false;
                if (!rep.is_unread) return false;
                const seenTime = lastSeen[r.id];
                if (!seenTime) return true;
                return new Date(rep.created_at) > new Date(seenTime);
            });
    });

    roots.sort((a, b) => {
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    return roots;
}

// --- MAIN HOOK ---
export function useMessages(sessionId, isOwner, ownerName) {
    const [rows, setRows] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);

    // 1. FETCH MESSAGES
    useEffect(() => {
        async function fetchMessages() {
            setLoadingMessages(true);
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .order("created_at", { ascending: false });

            if (!error) {
                setRows(data);
            }
            setLoadingMessages(false);
        }
        fetchMessages();
    }, []);

    // 2. REALTIME SUPABASE
    useEffect(() => {
        const channel = supabase
            .channel("realtime-messages")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "messages" },
                payload => {
                    const { eventType, new: newRow, old } = payload;
                    setRows(prev => {
                        if (eventType === "INSERT") {
                            if (prev.some(r => r.id === newRow.id)) return prev;
                            return [...prev, newRow];
                        }
                        if (eventType === "UPDATE") {
                            return prev.map(r => r.id === newRow.id ? newRow : r);
                        }
                        if (eventType === "DELETE") {
                            return prev.filter(r => r.id !== old.id);
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // 3. FUNGSI SEND (UPDATED: BISA TERIMA GAMBAR)
    async function send(senderName, messageText, isAnon, imageUrl = null) {
        const finalSenderName = isOwner
            ? ownerName
            : isAnon
                ? "Anonymous"
                : senderName;

        const messageSessionId = isOwner ? null : sessionId;

        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_name: finalSenderName,
                content: messageText,
                parent_id: null,
                session_id: messageSessionId,
                image_url: imageUrl // MENYIMPAN LINK GAMBAR KE DATABASE
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            throw new Error("Gagal mengirim pesan.");
        }

        setRows(prev => [...prev, data]);

        // Opsional: Hit API Discord
        await fetch("/api/discord", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "message",
                sender: finalSenderName,
                content: messageText,
                hasImage: !!imageUrl // Memberitahu Discord kalau ada gambar
            })
        }).catch(err => console.log("Discord webhook failed", err));
    }

    // 4. FUNGSI REPLY & DELETE
    function findRootMessage(messageId) {
        let current = rows.find(m => m.id === messageId);
        while (current && current.parent_id) {
            current = rows.find(m => m.id === current.parent_id);
        }
        return current;
    }

    // Tambahkan parameter imageUrl di akhir (default null)
    async function handleReply(messageId, text, parentReplyId = null, imageUrl = null) {
        if (!sessionId) return;
        const root = findRootMessage(parentReplyId ?? messageId);
        const isMyThread = root?.session_id === sessionId;

        if (!isOwner && !isMyThread) {
            alert("Kamu hanya bisa membalas pesan milikmu sendiri.");
            return;
        }

        const sender_name = isOwner ? ownerName : root?.sender_name || "Anonymous";
        const replySessionId = isOwner ? null : sessionId;

        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_name,
                content: text,
                parent_id: parentReplyId ?? messageId,
                session_id: replySessionId,
                is_unread: isOwner,
                image_url: imageUrl // <--- Simpan link gambar ke database
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
                repliedTo: root?.content?.slice(0, 100),
                hasImage: !!imageUrl // Info untuk Discord
            })
        }).catch(err => console.log("Discord webhook failed", err));
    }

    // ==========================================
    // GANTI KEDUA FUNGSI INI DI useMessages.js
    // ==========================================

    async function handleDelete(messageId) {
        if (!isOwner) return;
        if (!confirm("Hapus pesan ini (beserta semua balasannya)?")) return;

        // 1. Cari pesan utama dan SEMUA balasannya yang nempel
        const messagesToDelete = rows.filter(m => m.id === messageId || m.parent_id === messageId);

        // 2. Kumpulkan semua nama file gambar (jika ada) dari pesan-pesan tersebut
        const filesToRemove = messagesToDelete
            .filter(m => m.image_url) // Ambil yang ada gambarnya saja
            .map(m => {
                // Ekstrak nama file dari URL (contoh: url.com/.../attachments/12345.png -> 12345.png)
                return m.image_url.split('/attachments/')[1]?.split('?')[0];
            })
            .filter(Boolean); // Buang yang undefined/null

        // 3. Hapus massal gambarnya dari Storage Supabase (PENTING!)
        if (filesToRemove.length > 0) {
            const { error: storageError } = await supabase.storage.from('attachments').remove(filesToRemove);
            if (storageError) console.error("Gagal menghapus gambar di storage:", storageError);
        }

        // 4. Baru hapus pesannya dari Database
        await supabase.from("messages").delete().eq("id", messageId);
        
        // Update tampilan layar (hapus pesan utama dan anak-anaknya dari layar)
        setRows(prev => prev.filter(m => m.id !== messageId && m.parent_id !== messageId));
    }

    async function handleDeleteReply(_, replyId) {
        if (!confirm("Hapus balasan ini?")) return;

        // 1. Cari balasan yang mau dihapus
        const replyToDelete = rows.find(m => m.id === replyId);

        // 2. Kalau balasannya punya gambar, hapus dulu dari Storage
        if (replyToDelete && replyToDelete.image_url) {
            const fileName = replyToDelete.image_url.split('/attachments/')[1]?.split('?')[0];
            if (fileName) {
                await supabase.storage.from('attachments').remove([fileName]);
            }
        }

        // 3. Hapus teks balasannya dari Database
        await supabase.from("messages").delete().eq("id", replyId);
        setRows(prev => prev.filter(m => m.id !== replyId));
    }

    // --- DATA MEMOIZATION ---
    const messages = useMemo(() => buildThreads(rows, sessionId), [rows, sessionId]);

    const unreadCount = useMemo(() => {
        if (!sessionId) return 0;
        return messages.filter(m => m.hasUnread && m.session_id === sessionId).length;
    }, [messages, sessionId]);

    // --- EXPORT KE PUBLICPAGE.JSX ---
    return {
        rows,
        setRows,
        messages,
        unreadCount,
        loadingMessages,
        send,
        handleReply,
        handleDelete,
        handleDeleteReply
    };
}