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

export default function OverlayPage() {
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const isPlayingRef = useRef(false);

  // MENDENGARKAN TABEL BARU: dummy_donations
  useEffect(() => {
    const channel = supabase.channel('public:dummy_donations');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dummy_donations' }, (payload) => {
        if (payload.new.status === 'settlement' || payload.new.status === 'success') {
          setQueue((prev) => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !isPlayingRef.current) {
      processAlert(queue[0]);
    }
  }, [queue]);

  const processAlert = async (donation) => {
    isPlayingRef.current = true;
    setCurrentAlert(donation);

    let ytDuration = 0;
    if (donation.youtube_url && donation.youtube_url.includes('||')) {
        const parts = donation.youtube_url.split('||');
        if (parts.length === 3) ytDuration = parseInt(parts[2]) - parseInt(parts[1]); 
    }
    
    const displayDuration = ytDuration > 0 ? ytDuration * 1000 : 10000;

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

  if (!currentAlert) return <div className="w-screen h-screen bg-transparent overflow-hidden"></div>;

  let ytId = null;
  let startSec = 0;
  let endSec = 0;

  if (currentAlert.youtube_url) {
      const parts = currentAlert.youtube_url.split('||');
      ytId = getYouTubeID(parts[0]);
      if (parts.length === 3 && ytId) {
          startSec = parseInt(parts[1]);
          endSec = parseInt(parts[2]);
      }
  }

  return (
    <div className="w-screen h-screen bg-transparent flex flex-col items-center justify-end pb-24 overflow-hidden pointer-events-none">
      <div className="flex flex-col items-center animate-bounce">
        
        {ytId ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 mb-4 bg-black w-[450px] aspect-video">
             <YouTubePlayer ytId={ytId} startSec={startSec} endSec={endSec} volume={15} />
          </div>
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