// src/components/ProfileHeader.jsx
import { FaDiscord, FaGlobe } from "react-icons/fa";
import { SiRoblox } from "react-icons/si";
import { OWNER } from "../utils/constants";

export default function ProfileHeader({ onOpenWebsites, spotifyUrl }) {
    // Fungsi untuk mengubah link Spotify biasa jadi link Embed RESMI
    function getSpotifyEmbedUrl(url) {
        if (!url || typeof url !== 'string') return null;
        
        try {
            if (url.includes("/embed/")) return url;

            // Menggunakan URL Embed Resmi Spotify
            if (url.includes("/track/")) {
                const trackId = url.split("/track/")[1]?.split("?")[0];
                if (trackId) {
                    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&autoplay=1`;
                }
            }
            if (url.includes("/playlist/")) {
                const playlistId = url.split("/playlist/")[1]?.split("?")[0];
                if (playlistId) {
                    return `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0&autoplay=1`;
                }
            }
        } catch (error) {
            console.error("Gagal membaca link Spotify:", error);
            return null;
        }
        return null;
    }

    const embedUrl = getSpotifyEmbedUrl(spotifyUrl);

    return (
        <>
            <div className="relative">
                <img src="/banner.gif" alt="banner" className="object-cover w-full h-32" />
                
                {/* KONTINER AVATAR & IG NOTE */}
                <div className="absolute -bottom-10 left-6">
                    {/* AVATAR */}
                    <img
                        src="/avatar.gif"
                        alt="avatar"
                        className="w-28 h-28 bg-white rounded-full border-4 border-white shadow-lg relative z-0"
                    />
                </div>
            </div>

            <div className="flex flex-col px-6 pt-16 items-start gap-4">
                <div className="w-full">
                    <div className="flex items-center gap-2">
                        <p style={{ fontFamily: "'Press Start 2P', cursive" }} className="text-lg text-purple-600 font-bold animate-owner-float drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]">
                            {OWNER.name}
                        </p>
                        <a href={OWNER.robloxUrl} target="_blank" rel="noopener noreferrer" title="Roblox Profile" className="flex w-5 h-5 bg-[#325DF8] rounded-[3px] animate-owner-float items-center justify-center hover:scale-110 transition">
                            <SiRoblox className="w-3.5 h-3.5 text-white" />
                        </a>
                    </div>
                    <div className="flex mt-1 animate-owner-float items-center gap-2 mb-4">
                        <p className="text-sm text-gray-500">
                            @{OWNER.username} • {OWNER.tag}
                        </p>
                        <a href={OWNER.discordUrl} target="_blank" rel="noopener noreferrer" title="Discord">
                            <FaDiscord className="w-3.5 h-3.5 text-[#5865F2] opacity-80 hover:opacity-100 hover:scale-110 transition" />
                        </a>
                        <button onClick={onOpenWebsites} title="My Websites" className="focus:outline-none">
                            <FaGlobe className="w-3.5 h-3.5 text-emerald-500 opacity-80 hover:opacity-100 hover:scale-110 transition" />
                        </button>
                    </div>

                    {/* SPOTIFY EMBED PLAYER - DENGAN TRIK GLASSMORPHISM */}
                    {embedUrl && (
                        <div className="w-full animate-fade-in mt-2 relative group">
                            {/* Efek Glow ungu di belakang iframe */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>

                            {/* Bungkus putih transparan (Glassmorphism) */}
                            <div className="relative bg-white/50 backdrop-blur-md p-1.5 rounded-xl border border-white/80 shadow-sm">
                                <iframe
                                    style={{ borderRadius: "8px", backgroundColor: "transparent" }}
                                    src={embedUrl}
                                    width="100%"
                                    height="80"
                                    frameBorder="0"
                                    scrolling="no" /* INI YANG MENGHILANGKAN SCROLLBAR JELEK! */
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                ></iframe>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}