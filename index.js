const axios = require('axios');

module.exports = async (req, res) => {
    // Frontend (AI Studio) ကနေ လှမ်းခေါ်ရင် CORS block မဖြစ်အောင် တံခါးဖွင့်ပေးခြင်း
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET Request စမ်းသပ်ရန်
    if (req.method === 'GET') {
        return res.status(200).send('Universal Downloader API is Running Smoothly!');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'ကျေးဇူးပြု၍ ဗီဒီယို Link ထည့်ပေးပါ' });
    }

    try {
        // သုံးစွဲသူပေးလိုက်သော Link ၏ HTML Source တစ်ခုလုံးကို ဆာဗာနောက်ကွယ်ကနေ လှမ်းဆွဲယူခြင်း
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });

        const html = response.data;
        let videoUrl = '';

        // နည်းလမ်း (၁) - Open Graph Meta Tags များထဲမှ ဗီဒီယိုလင့်ခ်ကို Regex ဖြင့် လိုက်ရှာခြင်း (TikTok, FB, Insta အကုန်ရသည်)
        const ogVideoRegex = /<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i;
        const ogVideoSecureRegex = /<meta\s+property=["']og:video:secure_url["']\s+content=["']([^"']+)["']/i;
        const twitterVideoRegex = /<meta\s+name=["']twitter:player:stream["']\s+content=["']([^"']+)["']/i;

        let match = html.match(ogVideoRegex) || html.match(ogVideoSecureRegex) || html.match(twitterVideoRegex);

        if (match && match[1]) {
            videoUrl = match[1].replace(/&amp;/g, '&'); // လင့်ခ်ထဲက ကုဒ်အဆန်းများကို ဖယ်ရှားခြင်း
        }

        // နည်းလမ်း (၂) - မတွေ့သေးလျှင် ကုန်ကြမ်း HTML video tag ထဲက ထပ်ရှာခြင်း
        if (!videoUrl) {
            const videoTagRegex = /<video[^>]*src=["']([^"']+)["']/i;
            let videoMatch = html.match(videoTagRegex);
            if (videoMatch && videoMatch[1]) {
                videoUrl = videoMatch[1].replace(/&amp;/g, '&');
            }
        }

        // နည်းလမ်း (၃) - TikTok အတွက် သီးသန့် အပိုဆောင်း ထပ်ရှာပေးခြင်း
        if (!videoUrl && url.includes('tiktok.com')) {
            const ttRegex = /"downloadAddr"\s*:\s*["']([^"']+)["']/i;
            let ttMatch = html.match(ttRegex);
            if (ttMatch && ttMatch[1]) {
                videoUrl = JSON.parse(`"${ttMatch[1]}"`); // escape character များကို ရှင်းထုတ်ခြင်း
            }
        }

        // ဗီဒီယိုလင့်ခ် လုံးဝ ရှာမတွေ့ခဲ့လျှင်
        if (!videoUrl) {
            return res.status(404).json({ error: 'ဗီဒီယိုဖိုင်ကို ရှာမတွေ့ပါ။ လင့်ခ်အမှန် ပြန်စမ်းပေးပါဗျာ။' });
        }

        // AI Studio Frontend UI ဘက်က မျှော်လင့်ထားတဲ့ Object ပုံစံအတိုင်း ကွက်တိ ပြန်ထုတ်ပေးခြင်း
        return res.status(200).json({
            title: url.includes('tiktok.com') ? "TikTok Video Stream" : url.includes('facebook.com') ? "Facebook Video Stream" : "Universal Video Stream",
            preview_url: videoUrl,
            formats: [
                { quality: "HD No-Watermark (MP4)", size: "Auto Size", url: videoUrl }
            ]
        });

    } catch (error) {
        return res.status(500).json({ error: 'ဗီဒီယိုဖတ်ရယူခြင်း မအောင်မြင်ပါ- ' + error.message });
    }
};
