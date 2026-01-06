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

  const isMyThread = data.session_id === sessionId;
  const canReplyThread = isOwner || isMyThread;

  function submitReply() {
    if (!replyText.trim()) return;

    onReply(
      data.id,
      replyText,
      replyingTo === "message" ? null : replyingTo
    );

    setReplyText("");
    setReplyingTo(null);
  }

  async function markThreadAsRead() {
    // 🔔 nyalakan efek sementara (2 detik)
    setFlashNotify(true);
    setTimeout(() => setFlashNotify(false), 2000);
    const ownerReplies = data.replies.filter(
      r => r.session_id === null
    );

    if (ownerReplies.length === 0) return;

    // ambil waktu TERBARU yang pasti
    const latestTime = ownerReplies.reduce(
      (max, r) =>
        new Date(r.created_at) > new Date(max)
          ? r.created_at
          : max,
      ownerReplies[0].created_at
    );

    // simpan ke localStorage
    const lastSeen = JSON.parse(
      localStorage.getItem("last_seen_time") || "{}"
    );

    lastSeen[data.id] = latestTime;
    localStorage.setItem(
      "last_seen_time",
      JSON.stringify(lastSeen)
    );

    // update DB (opsional)
    await supabase
      .from("messages")
      .update({ is_unread: false })
      .eq("parent_id", data.id)
      .eq("session_id", null);

    // update state lokal
    data.replies.forEach(r => {
      if (r.session_id === null) r.is_unread = false;
    });
    data.hasUnread = false;
  }


  return (
    <div
      className={`
    bg-white rounded-xl border shadow-sm p-4 space-y-4
    ${(data.hasUnread || flashNotify) ? "ring-2 ring-red-300" : ""}
  `}
    >

      {/* ================= MAIN MESSAGE ================= */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            {data.hasUnread && (
              <span
                title="Balasan baru"
                className="
      ml-1
      w-2 h-2
      rounded-full
      bg-red-500
      animate-pulse
    "
              />
            )}
            <FaUserCircle className="text-gray-400 text-lg" />
            <span className="text-sm font-medium text-gray-800">
              {data.sender}
            </span>
          </div>

          <span className="text-xs text-gray-400">
            {formatTime(data.created_at)}
          </span>
        </div>

        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all">
          {data.content}
        </p>

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {canReplyThread && (
            <button
              onClick={async () => {
                await markThreadAsRead();
                setReplyingTo("message");
                setShowReplies(true);
              }}
              className="hover:text-purple-600"
            >
              Reply
            </button>
          )}

          {data.replies?.length > 0 && (
            <button
              onClick={async () => {
                await markThreadAsRead();
                setShowReplies(v => !v);
              }}
              className="text-purple-500 hover:underline"
            >
              {showReplies
                ? "Sembunyikan balasan"
                : `Lihat balasan (${data.replies.length})`}
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => onDelete(data.id)}
              className="hover:text-red-500"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ================= REPLIES ================= */}
      {showReplies && data.replies?.map(reply => {
        const isOwnerReply = reply.session_id === null;
        const repliedTo =
          reply.parent_id === data.id
            ? data
            : data.replies.find(r => r.id === reply.parent_id) || data;

        const canReplyReply = isOwner || isMyThread;

        return (
          <div key={reply.id} className="border-t pt-3 space-y-1">

            {/* REPLY PREVIEW */}
            <div className="flex gap-2 text-xs text-gray-500">
              <div
                className={`w-[2px] rounded-full ${isOwnerReply ? "bg-purple-300" : "bg-gray-300"
                  }`}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`flex items-center gap-1 ${isOwnerReply ? "text-purple-600" : "text-gray-500"
                    }`}
                >
                  <FaReply className="text-[10px]" />
                  <span>
                    Replying to <b>{repliedTo.sender}</b>
                  </span>
                </div>
                <div className="italic text-gray-400 truncate">
                  “{repliedTo.content}”
                </div>
              </div>
            </div>

            {/* REPLY CONTENT */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <FaUserCircle
                    className={`text-lg ${isOwnerReply ? "text-purple-500" : "text-gray-400"
                      }`}
                  />
                  <span
                    className={`text-sm font-medium ${isOwnerReply ? "text-purple-600" : "text-gray-700"
                      }`}
                  >
                    {reply.sender}
                  </span>
                </div>

                <span className="text-xs text-gray-400">
                  {formatTime(reply.created_at)}
                </span>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all">
                {reply.content}
              </p>

              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                {canReplyReply && (
                  <button
                    onClick={() => {
                      setReplyingTo(reply.id);
                      setShowReplies(true);
                    }}
                    className="hover:text-purple-600"
                  >
                    Reply
                  </button>
                )}

                {isOwner && (
                  <button
                    onClick={() => onDeleteReply(data.id, reply.id)}
                    className="hover:text-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ================= INLINE REPLY BOX ================= */}
      {replyingTo && (
        <div className="relative pt-2 border-t">
          <textarea
            value={replyText}
            maxLength={MAX_REPLY}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tulis balasan..."
            className="
              w-full p-3 pb-7 text-sm
              rounded-lg border resize-none
              focus:outline-none focus:ring-2 focus:ring-purple-400
            "
          />

          <span
            className={`
              absolute bottom-9 right-3 text-xs
              ${replyText.length >= MAX_REPLY
                ? "text-red-500"
                : replyText.length > MAX_REPLY - 20
                  ? "text-yellow-500"
                  : "text-gray-400"
              }
            `}
          >
            {replyText.length}/{MAX_REPLY}
          </span>

          <div className="flex justify-end gap-3 mt-2 text-xs">
            <button
              onClick={() => {
                setReplyingTo(null);
                setReplyText("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>

            <button
              disabled={!replyText.trim()}
              onClick={submitReply}
              className="text-purple-600 font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
