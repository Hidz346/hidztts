// api/index.js
// Proxy server-side untuk API TTS Nanzz.
//
// KENAPA FILE INI ADA:
// Saat browser (fetch di tts.html) memanggil api-nanzz.my.id secara langsung,
// requestnya lintas-domain (cross-origin). Kalau server sumber itu tidak
// mengirim header CORS yang benar, atau memblokir request yang "berbau" script
// (tanpa User-Agent browser normal), browser akan menolak respons itu — walau
// request sebenarnya berhasil di sisi server. Ini pas menjelaskan kenapa
// membuka URL API langsung di tab browser terlihat lancar, tapi generate dari
// halaman tts.html gagal.
//
// Dengan proxy ini, yang memanggil api-nanzz adalah SERVER Vercel kita
// (server-to-server, bukan browser), jadi tidak ada lagi batasan CORS.
// Hasilnya lalu diteruskan ke browser dengan header CORS yang benar.

export default async function handler(req, res) {
    const { text } = req.query;

    if (!text || !String(text).trim()) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(400).json({
            status: false,
            message: "Parameter 'text' wajib diisi."
        });
    }

    const upstreamUrl = `https://api-nanzz.my.id/docs/api/ai/text-to-speech.php?text=${encodeURIComponent(text)}`;

    try {
        const upstreamRes = await fetch(upstreamUrl, {
            headers: {
                // User-Agent browser biasa, jaga-jaga kalau server sumber
                // memblokir request tanpa User-Agent (umum untuk API scraping).
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        const rawText = await upstreamRes.text();

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseErr) {
            // API sumber tidak membalas JSON (misalnya halaman error/HTML/down).
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(502).json({
                status: false,
                message: `API sumber tidak mengembalikan JSON yang valid (HTTP ${upstreamRes.status}).`,
                raw_preview: rawText.slice(0, 300)
            });
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(upstreamRes.status).json(data);

    } catch (err) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            status: false,
            message: `Gagal menghubungi API sumber: ${err.message}`
        });
    }
}
