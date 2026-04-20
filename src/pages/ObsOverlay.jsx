import { useEffect, useState, useRef } from 'react';

// Helper mengekstrak ID YouTube
const getYouTubeID = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

// Komponen Khusus Player YouTube API
const YouTubePlayer = ({ ytId, startSec, endSec, volume = 15 }) => {
  useEffect(() => {
    let player;
    const initPlayer = () => {
      player = new window.YT.Player('yt-player-container', {
        videoId: ytId,
        playerVars: {
          autoplay: 1, controls: 0, start: startSec, end: endSec, modestbranding: 1, rel: 0, disablekb: 1
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(volume);
            event.target.playVideo();
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initPlayer;
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => { if (player && typeof player.destroy === 'function') player.destroy(); };
  }, [ytId, startSec, endSec, volume]);

  return <div id="yt-player-container" className="w-full h-full pointer-events-none"></div>;
};

export default function ObsOverlay() {
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const channel = new BroadcastChannel('donasi_dummy_channel');
    
    channel.onmessage = (event) => {
      setQueue((prev) => [...prev, event.data]);
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    if (hasInteracted && queue.length > 0 && !isPlayingRef.current) {
      processAlert(queue[0]);
    }
  }, [queue, hasInteracted]);

  const processAlert = async (data) => {
    isPlayingRef.current = true;
    setCurrentAlert(data);

    // Durasi default diubah menjadi 10 detik (10000ms)
    const displayDuration = data.duration ? (data.duration * 1000) : 10000;

    const sfxUrl = 'https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3';
    const audio = new Audio(sfxUrl);
    audio.volume = 1.0; 
    audio.play().catch(e => console.error("Gagal play sound:", e));

    await new Promise(resolve => setTimeout(resolve, displayDuration));

    setCurrentAlert(null);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setQueue((prev) => prev.slice(1));
    isPlayingRef.current = false;
  };

  if (!hasInteracted) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center bg-slate-800 p-10 rounded-3xl border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] max-w-2xl">
          <h1 className="text-white text-3xl font-black mb-4">Menunggu Interaksi Browser</h1>
          <p className="text-slate-400 mb-8 text-lg">
            Browser memblokir autoplay video dan suara. Klik tombol di bawah ini untuk memberikan izin dan mengaktifkan Overlay.
          </p>
          <button 
            onClick={() => setHasInteracted(true)}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 px-8 rounded-2xl text-2xl transition-all active:scale-95 animate-pulse shadow-xl"
          >
            👆 KLIK UNTUK AKTIFKAN OVERLAY
          </button>
        </div>
      </div>
    );
  }

  if (!currentAlert) return <div className="w-screen h-screen bg-transparent overflow-hidden"></div>;

  const ytId = getYouTubeID(currentAlert.mediaUrl);
  const startSec = currentAlert.ytStart || 0;
  const endSec = currentAlert.ytEnd || 0;
  const isGifOrImage = currentAlert.mediaUrl && !ytId;

  return (
    <div className="w-screen h-screen bg-transparent flex flex-col items-center justify-end pb-24 overflow-hidden pointer-events-none">
      <div className="flex flex-col items-center animate-bounce">
        
        {ytId ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 mb-4 bg-black w-[450px] aspect-video">
             <YouTubePlayer ytId={ytId} startSec={startSec} endSec={endSec} volume={15} />
          </div>
        ) : isGifOrImage ? (
          <img 
            src={currentAlert.mediaUrl} 
            alt="Donation Media" 
            className="max-w-[300px] max-h-[300px] rounded-2xl shadow-2xl object-cover mb-4"
          />
        ) : (
          <div className="bg-[#2ce0a6] rounded-xl px-12 py-8 mb-4 shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex flex-col items-center">
            <h1 className="text-white text-6xl font-black tracking-wider shadow-sm" style={{ textShadow: '2px 4px 0px rgba(0,0,0,0.2)' }}>
              THANKS!
            </h1>
            <div className="w-4/5 h-[6px] bg-white mt-2 shadow-sm rounded-full" style={{ boxShadow: '1px 2px 0px rgba(0,0,0,0.2)' }}></div>
          </div>
        )}

        {/* Format Teks Disesuaikan (Shadow saja, warna hijau & kuning) */}
        <div className="text-center font-sans mt-2">
          <h2 className="text-3xl font-black tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[#2bff1a]">IDR{currentAlert.nominal}</span>
            <span className="text-white mx-2">dari</span>
            <span className="text-[#2bff1a]">{currentAlert.nama}</span>
          </h2>
          {currentAlert.pesan && (
            <p className="text-2xl font-bold text-[#ffeb3b] mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-2xl mx-auto">
              {currentAlert.pesan}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}