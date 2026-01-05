import { FaReply } from "react-icons/fa";

export default function ReplyPreview({ repliedTo }) {
  if (!repliedTo) return null;

  return (
    <div className="flex gap-2 mb-2 text-xs text-gray-500">
      {/* Garis kecil */}
      <div className="w-[2px] bg-purple-300 rounded-full" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-purple-600">
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
  );
}