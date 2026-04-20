import { useState } from 'react';
import { Heart, Send, User, Mail, Play } from 'lucide-react';

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 500000];

const getYouTubeID = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
};

export default function DummyForm() {
    const [form, setForm] = useState({
        username: '',
        isAnonymous: false,
        email: '',
        hideEmail: false,
        amount: 10000,
        message: '',
        youtube_url: '',
        yt_start_min: 0,
        yt_start_sec: 0
    });
    
    const [isCustomAmount, setIsCustomAmount] = useState(false);
    const [loading, setLoading] = useState(false);

    const amountNum = parseInt(form.amount) || 0;
    const isFormValid = 
        amountNum >= 1000 && 
        (form.isAnonymous || form.username.trim() !== '');

    const ytId = getYouTubeID(form.youtube_url);
    const startSecPreview = (parseInt(form.yt_start_min) || 0) * 60 + (parseInt(form.yt_start_sec) || 0);
    const durationPreview = amountNum < 10000 ? 10 : 30; 
    const endSecPreview = startSecPreview + durationPreview;

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (amountNum < 1000) return alert('Minimal donasi adalah Rp 1.000');

        setLoading(true);

        try {
            const finalUsername = form.isAnonymous ? 'Anonymous' : (form.username || 'Hamba Allah');

            // Buka jalur komunikasi ke OBS Overlay
            const channel = new BroadcastChannel('donasi_dummy_channel');
            
            // Kirim data ke OBS (tanpa Supabase/Midtrans)
            channel.postMessage({
                nama: finalUsername,
                nominal: amountNum,
                pesan: form.message,
                mediaUrl: form.youtube_url,
                ytStart: startSecPreview,
                ytEnd: endSecPreview,
                duration: durationPreview
            });

            channel.close();
            
            // Beri feedback visual tanpa me-reload halaman
            setTimeout(() => {
                setLoading(false);
                alert('Berhasil! Cek layar OBS kamu.');
            }, 500);

        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat mengirim ke OBS.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 text-white font-sans py-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl max-w-md w-full p-8 rounded-3xl">
                <div className="flex flex-col items-center gap-2 mb-8 text-center">
                    <div className="bg-red-500/20 p-4 rounded-full">
                        <Heart className="text-red-500 fill-red-500" size={36} />
                    </div>
                    <h1 className="text-3xl font-black mt-2">Panel Dummy OBS</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username & Anonim */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-neutral-300">Nama Pengirim</label>
                            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                                <input type="checkbox" className="accent-red-500" 
                                    checked={form.isAnonymous} 
                                    onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
                                Sembunyikan Nama
                            </label>
                        </div>
                        {!form.isAnonymous && (
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-neutral-500" size={18} />
                                <input required={!form.isAnonymous} maxLength="50" type="text" placeholder="Nama Anda"
                                    className="w-full bg-neutral-800/50 rounded-xl pl-10 pr-3 py-3 outline-none border border-neutral-700 focus:border-red-500 transition"
                                    onChange={(e) => setForm({ ...form, username: e.target.value })} />
                            </div>
                        )}
                    </div>

                    {/* Nominal Pilihan */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Pilih Nominal</label>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            {PRESET_AMOUNTS.map((amt) => (
                                <button key={amt} type="button"
                                    onClick={() => { setForm({ ...form, amount: amt }); setIsCustomAmount(false); }}
                                    className={`py-2 rounded-lg text-sm font-bold border transition ${form.amount === amt && !isCustomAmount ? 'bg-red-500 border-red-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-red-500/50'}`}>
                                    {(amt / 1000)}K
                                </button>
                            ))}
                            <button type="button" onClick={() => setIsCustomAmount(true)}
                                className={`py-2 rounded-lg text-sm font-bold border transition ${isCustomAmount ? 'bg-red-500 border-red-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-red-500/50'}`}>
                                Custom
                            </button>
                        </div>
                        {isCustomAmount && (
                            <input required type="number" min="1000" max="10000000" placeholder="Masukkan nominal (Min 1.000)"
                                value={form.amount}
                                className="w-full bg-neutral-800/50 rounded-xl p-3 outline-none border border-neutral-700 focus:border-red-500 transition mt-2"
                                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                        )}
                    </div>

                    {/* Pesan */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Pesan (Max 200 char)</label>
                        <textarea maxLength="200" rows="3" placeholder="Pesan dukungan Anda..."
                            className="w-full bg-neutral-800/50 rounded-xl p-3 outline-none border border-neutral-700 focus:border-red-500 transition resize-none"
                            onChange={(e) => setForm({ ...form, message: e.target.value })} />
                    </div>

                    {/* YouTube Request & Live Preview */}
                    <div className="p-4 bg-neutral-800/30 border border-neutral-700 rounded-xl space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                            <Play className="text-red-500" size={18} /> Video YouTube / Link GIF (Opsional)
                        </label>
                        <input type="text" placeholder="Paste URL YouTube atau Link .gif..."
                            className="w-full bg-neutral-800/50 rounded-lg p-3 outline-none border border-neutral-700 focus:border-red-500 transition text-sm"
                            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
                        
                        {ytId && (
                            <div className="flex flex-col gap-3 bg-neutral-900/80 p-3 rounded-lg border border-neutral-700 mt-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs text-neutral-400">Mulai:</span>
                                        <input type="number" min="0" placeholder="Min" className="w-14 bg-neutral-800 p-1.5 rounded text-xs text-center border border-neutral-700 outline-none focus:border-red-500" onChange={(e) => setForm({...form, yt_start_min: e.target.value})} />
                                        <span className="text-neutral-500">:</span>
                                        <input type="number" min="0" max="59" placeholder="Sec" className="w-14 bg-neutral-800 p-1.5 rounded text-xs text-center border border-neutral-700 outline-none focus:border-red-500" onChange={(e) => setForm({...form, yt_start_sec: e.target.value})} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-neutral-400 italic">Play otomatis</p>
                                        <p className="text-xs font-bold text-red-400">{durationPreview} Detik</p>
                                    </div>
                                </div>
                                <div className="w-full aspect-video rounded-md overflow-hidden bg-black border border-neutral-600 relative">
                                    <iframe 
                                        width="100%" height="100%" 
                                        src={`https://www.youtube.com/embed/${ytId}?start=${startSecPreview}&end=${endSecPreview}&controls=1`} 
                                        title="YouTube video preview" frameBorder="0" allowFullScreen>
                                    </iframe>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tombol Submit */}
                    <button 
                        disabled={loading || !isFormValid} 
                        type="submit"
                        className={`w-full font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg ${
                            loading || !isFormValid 
                                ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-500/30'
                        }`}
                    >
                        {loading ? 'Mengirim ke OBS...' : (
                            isFormValid ? `Kirim Dummy Rp ${amountNum.toLocaleString('id-ID')}` : 'Lengkapi Form'
                        )} 
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}