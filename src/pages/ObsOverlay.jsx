import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const getYouTubeID = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

const YouTubePlayer = ({ ytId, startSec, endSec, volume = 15 }) => {
  useEffect(() => {
    let player;
    const initPlayer = () => {
      player = new window.YT.Player('yt-player-container', {
        videoId: ytId,
        playerVars: { autoplay: 1, controls: 0, start: startSec, end: endSec, modestbranding: 1, rel: 0, disablekb: 1 },
        events: { onReady: (event) => { event.target.setVolume(volume); event.target.playVideo(); } }
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

export default function OverlayPage() {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const isPlayingRef = useRef(false);

  // MENDENGARKAN SUPABASE JALUR VVIP (Tanpa Cek Status)
  useEffect(() => {
    const channel = supabase.channel('public:dummy_donations');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dummy_donations' }, (payload) => {
        console.log("🔥 DATA MASUK DARI SUPABASE!", payload.new);
        // Langsung masukkan ke antrean tanpa banyak syarat
        setQueue((prev) => [...prev, payload.new]);
      })
      .subscribe((status) => {
        console.log("🔌 STATUS REALTIME:", status);
      });

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (hasInteracted && queue.length > 0 && !isPlayingRef.current) {
      processAlert(queue[0]);
    }
  }, [queue, hasInteracted]);

  const processAlert = async (donation) => {
    isPlayingRef.current = true;
    setCurrentAlert(donation);

    let ytDuration = 0;
    if (donation.youtube_url && donation.youtube_url.includes('||')) {
        const parts = donation.youtube_url.split('||');
        if (parts.length === 3) ytDuration = parseInt(parts[2]) - parseInt(parts[1]); 
    }
    
    const displayDuration = ytDuration > 0 ? ytDuration * 1000 : 10000;

    try {
      const sfxUrl = 'https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3';
      const audio = new Audio(sfxUrl);
      audio.volume = 1.0; 
      await audio.play();
    } catch (e) {
      console.log("Suara diblokir browser, tapi animasi tetap lanjut");
    }

    await new Promise(resolve => setTimeout(resolve, displayDuration));

    setCurrentAlert(null);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setQueue((prev) => prev.slice(1));
    isPlayingRef.current = false;
  };

  // TOMBOL TEST MANUAL UNTUK CEK UI
  const triggerTestAlert = () => {
    setQueue((prev) => [...prev, {
      username: "Tester", amount: 69420, message: "Ini tes UI dari tombol lokal!", youtube_url: null
    }]);
  };

  if (!hasInteracted) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center bg-slate-800 p-10 rounded-3xl border-2 border-red-500 max-w-2xl">
          <h1 className="text-white text-3xl font-black mb-4">Menunggu Interaksi OBS</h1>
          <button onClick={() => setHasInteracted(true)} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 px-8 rounded-2xl text-2xl transition-all shadow-xl">
            👆 KLIK UNTUK AKTIFKAN OVERLAY
          </button>
        </div>
      </div>
    );
  }

  // TAMPILAN STANDBY (Dengan tombol Test Kecil di pojok)
  if (!currentAlert) {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden relative">
        <button onClick={triggerTestAlert} className="absolute top-2 left-2 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100 z-50">
          TEST UI (Klik Saya)
        </button>
      </div>
    );
  }

  let ytId = null;
  let startSec = 0;
  let endSec = 0;
  let isGifOrImage = false;

  if (currentAlert.youtube_url) {
      const parts = currentAlert.youtube_url.split('||');
      ytId = getYouTubeID(parts[0]);
      if (parts.length === 3 && ytId) {
          startSec = parseInt(parts[1]);
          endSec = parseInt(parts[2]);
      }
      if (!ytId && currentAlert.youtube_url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
          isGifOrImage = true;
      }
  }

  return (
    // DIUBAH MENJADI TEPAT DI TENGAH LAYAR (justify-center) AGAR TIDAK NYUNGSEP
    <div className="w-screen h-screen bg-transparent flex flex-col items-center justify-center overflow-hidden pointer-events-none relative">
      <div className="flex flex-col items-center animate-bounce">
        
        {ytId ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 mb-4 bg-black w-[450px] aspect-video">
             <YouTubePlayer ytId={ytId} startSec={startSec} endSec={endSec} volume={15} />
          </div>
        ) : isGifOrImage ? (
          <img src={currentAlert.youtube_url.split('||')[0]} alt="Media" className="max-w-[300px] max-h-[300px] rounded-2xl shadow-2xl object-cover mb-4" />
        ) : (
          <div className="bg-[#2ce0a6] rounded-xl px-12 py-8 mb-4 shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex flex-col items-center">
            <h1 className="text-white text-6xl font-black tracking-wider shadow-sm" style={{ textShadow: '2px 4px 0px rgba(0,0,0,0.2)' }}>
              THANKS!
            </h1>
            <div className="w-4/5 h-[6px] bg-white mt-2 shadow-sm rounded-full" style={{ boxShadow: '1px 2px 0px rgba(0,0,0,0.2)' }}></div>
          </div>
        )}

        <div className="text-center font-sans mt-2">
          <h2 className="text-3xl font-black tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[#2bff1a]">IDR{currentAlert.amount}</span>
            <span className="text-white mx-2">dari</span>
            <span className="text-[#2bff1a]">{currentAlert.username}</span>
          </h2>
          {currentAlert.message && (
            <p className="text-2xl font-bold text-[#ffeb3b] mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-2xl mx-auto">
              {currentAlert.message}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}