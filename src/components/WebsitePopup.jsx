// src/components/WebsitePopup.jsx
import { FaGlobe } from "react-icons/fa";
import { MY_WEBSITES, OWNER } from "../utils/constants";

export default function WebsitePopup({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-pop-in relative">
                <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <FaGlobe /> Website List
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white font-bold text-xl"
                    >
                        ✖
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                    {MY_WEBSITES.map((web, idx) => (
                        <a
                            key={idx}
                            href={web.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-purple-50 hover:border-purple-200 hover:shadow-md transition-all duration-300"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-purple-600">
                                {web.name}
                            </span>
                            <span className="text-gray-300 group-hover:translate-x-1 transition-transform">
                                ⮕
                            </span>
                        </a>
                    ))}
                    {MY_WEBSITES.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">Belum ada website yang ditambahkan.</p>
                    )}
                </div>

                <div className="bg-gray-50 p-3 text-center text-[10px] text-gray-400 uppercase tracking-widest">
                    {OWNER.name}'s Projects
                </div>
            </div>
        </div>
    );
}