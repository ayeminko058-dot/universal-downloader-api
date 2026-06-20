const express = require('express');
const cors = require('cors');
const { exec } = require('yt-dlp-exec');
const fbDownloader = require('fb-downloader-scrapper');

const app = express();
app.use(cors());
app.use(express.json());

// API အလုပ်လုပ်၊ မလုပ် စမ်းသပ်ရန်
app.get('/', (req, res) => res.send('Universal Downloader API is Running!'));

// AI Studio UI ကနေ Link ပို့ရင် ဒီလမ်းကြောင်းထဲကို ရောက်လာပါမယ်
app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'ကျေးဇူးပြု၍ ဗီဒီယို Link ထည့်ပေးပါ' });
    }

    try {
        // ၁။ Facebook ဗီဒီယို ဖြစ်ခဲ့လျှင်
        if (url.includes('facebook.com') || url.includes('fb.watch')) {
            const fbData = await fbDownloader(url);
            return res.json({
                title: "Facebook Video",
                preview_url: fbData.hd || fbData.sd,
                formats: [
                    { quality: "HD Quality (MP4)", url: fbData.hd, size: "Auto Size" },
                    { quality: "SD Quality (MP4)", url: fbData.sd, size: "Auto Size" }
                ]
            });
        }

        // ၂။ YouTube သို့မဟုတ် TikTok သို့မဟုတ် အခြား Link များ ဖြစ်ခဲ့လျှင်
        const output = await exec(url, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
        });

        const videoData = JSON.parse(output);
        
        // အသံရော ရုပ်ပါပါတဲ့ ဗီဒီယို Format တွေကိုပဲ ရွေးထုတ်ခြင်း
        const formats = videoData.formats
            .filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
            .map(f => ({
                quality: `${f.height ? f.height + 'p' : 'HQ'} (${f.ext.toUpperCase()})`,
                url: f.url,
                size: f.filesize ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` : "Auto Size"
            }));

        return res.json({
            title: videoData.title || "Parsed Video",
            preview_url: videoData.thumbnail || videoData.url,
            formats: formats.slice(0, 4) // အကောင်းဆုံး Format ၄ ခုပဲ ယူပြမယ်
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'ဗီဒီယိုကို ဖတ်လို့မရပါသဖြင့် Link မှန်မမှန် ပြန်စစ်ပေးပါ' });
    }
});

module.exports = app;
