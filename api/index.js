import axios from 'axios';

#Comment Here

// --- Configuration ---
// Hardcoded fallback trackers to ensure immediate functionality if the list fetch fails or times out
const FALLBACK_TRACKERS = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://9.rarbg.com:2810/announce",
    "udp://tracker.openbittorrent.com:80/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://open.stealth.si:80/announce",
    "udp://vibe.sleepyinternetfun.xyz:1738/announce",
    "udp://tracker1.bt.moack.co.kr:80/announce",
    "udp://tracker.zerobytes.xyz:1337/announce",
    "udp://explodie.org:6969/announce",
    "udp://tracker.leechers-paradise.org:6969/announce"
];

const TRACKER_URL = "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt";
const APIBAY_URL = "https://apibay.org/q.php";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// --- In-Memory Cache ---
let trackerCache = { data: [], lastUpdated: 0 };

async function getTrackers() {
    const now = Date.now();
    // Refresh only if cache is old (15 mins) or empty
    if (now - trackerCache.lastUpdated > 1000 * 60 * 15 || trackerCache.data.length === 0) {
        try {
            // Strict 3s timeout. If github is slow, we use fallbacks immediately to prevent Stremio timeout.
            console.log("Fetching trackers...");
            const resp = await axios.get(TRACKER_URL, { timeout: 3000 });
            const lines = resp.data.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            trackerCache.data = lines;
            trackerCache.lastUpdated = now;
            console.log(`Updated trackers: ${lines.length} found`);
        } catch (e) {
            console.error(`Tracker fetch failed (${e.message}). Using fallbacks.`);
            if (trackerCache.data.length === 0) {
                trackerCache.data = FALLBACK_TRACKERS;
            }
        }
    }
    return trackerCache.data;
}

function parseConfig(configStr) {
    if (!configStr) return {};
    try {
        // Handle URL-Safe Base64 (RFC 4648)
        let base64 = configStr.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding
        while (base64.length % 4) base64 += '=';
        // Decode
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (e) {
        console.warn("Config parse warning:", e.message);
        return {};
    }
}

function getResolution(title) {
    const t = title.toUpperCase();
    if (t.includes('2160P') || t.includes('4K')) return '4K';
    if (t.includes('1080P')) return '1080p';
    if (t.includes('720P')) return '720p';
    return 'SD';
}

function getManifest(host, configStr) {
    return {
        id: "org.community.cloud.scraper",
        version: "1.2.3",
        name: "Cloud Stream Scraper",
        description: "Configurable Cloud Scraper with RD Support",
        catalogs: [],
        resources: [
            {
                name: "stream",
                types: ["movie", "series"],
                idPrefixes: ["tt"]
            }
        ],
        types: ["movie", "series"],
        behaviorHints: {
            configurable: true,
            configurationRequired: false,
            // Point back to the configuration page
            configurationLocation: `https://${host}/${configStr || ''}`
        }
    };
}

async function getStreams(type, id, config) {
    let query = id;
    let season = null, episode = null;

    if (type === 'series' || id.includes(':')) {
        const parts = id.split(':');
        query = parts[0];
        season = parseInt(parts[1]);
        episode = parseInt(parts[2]);
    }

    if (!query.startsWith('tt')) {
        return [];
    }

    // Parallel execution: Get trackers while calculating other things
    const trackersPromise = getTrackers();
    
    const minSeeds = parseInt(config.minSeeds) || 0;
    const maxGB = parseFloat((config.maxSize || "10").replace(/[^0-9.]/g, ''));
    const allowedRes = Array.isArray(config.res) ? config.res : (config.res ? [config.res] : ['1080p']);
    const maxResultsPerRes = parseInt(config.maxResultsPerRes) || 5;

    try {
        // Call APIBay
        console.log(`[APIBay] Searching: ${query}`);
        const searchUrl = `${APIBAY_URL}?q=${query}&cat=0`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 8000 // 8s timeout for the scraping itself
        });

        if (!Array.isArray(data) || data.length === 0 || data[0]?.id === '0') {
            console.log("[APIBay] No results found.");
            return [];
        }

        const validTorrents = data.filter(t => {
            const sizeGB = t.size / 1073741824;
            const seeds = parseInt(t.seeders);
            
            if (seeds < minSeeds) return false;
            if (sizeGB > maxGB) return false;

            if (type === 'series' && season && episode) {
                const s = season, e = episode;
                const regexes = [
                    new RegExp(`S0?${s}\\s?E0?${e}`, 'i'),
                    new RegExp(`${s}x0?${e}`, 'i'),
                    new RegExp(`Season\\s?${s}`, 'i')
                ];
                if (!regexes.some(r => r.test(t.name))) return false;
            }
            return true;
        });

        // Resolve trackers now
        const trackers = await trackersPromise;

        const grouped = { '4K': [], '1080p': [], '720p': [], 'SD': [] };
        validTorrents.forEach(t => {
            const res = getResolution(t.name);
            if (allowedRes.includes(res)) grouped[res].push(t);
        });

        let finalStreams = [];
        ['4K', '1080p', '720p', 'SD'].forEach(resKey => {
            if (grouped[resKey].length > 0) {
                const sorted = grouped[resKey].sort((a, b) => parseInt(b.seeders) - parseInt(a.seeders));
                finalStreams = [...finalStreams, ...sorted.slice(0, maxResultsPerRes)];
            }
        });

        console.log(`[APIBay] Returning ${finalStreams.length} streams`);

        return finalStreams.map(t => {
            // Only add the top 10 trackers to keep magnet link size manageable
            const trParams = trackers.slice(0, 15).map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
            const magnet = `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.name)}${trParams}`;
            
            return {
                name: `[${t.seeders}] ${t.name.substring(0, 20)}`,
                title: `${t.name}\nS:${t.seeders} | ${(t.size / 1073741824).toFixed(1)}GB`,
                url: magnet,
                behaviorHints: {
                    bingeGroup: `res-${getResolution(t.name)}`
                }
            };
        });

    } catch (e) {
        console.error("Scrape Error:", e.message);
        return [];
    }
}

// --- Vercel Request Handler ---
export default async function handler(req, res) {
    // 1. CORS Headers (Crucial for Stremio)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Cache-Control', 'max-age=0, s-maxage=86400'); // Cache for speed

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. Parse Parameters from Query (Vercel Rewrites automatically populate req.query)
        // URL Pattern: /:config/stream/:type/:id.json
        // req.query will contain { config: '...', type: '...', id: '...' }
        let { config: configStr, type, id } = req.query;

        // Clean up ID if it comes with extension (Stremio sends .json)
        if (id && id.endsWith('.json')) {
            id = id.replace('.json', '');
        }

        const config = parseConfig(configStr);

        // 3. Determine Route
        // Check if it's a Manifest Request
        // Vercel rewrite source: "/:config/manifest.json" -> req.query.config exists, req.query.id missing
        // OR root "/manifest.json" -> req.query empty
        const isManifest = req.url.includes('manifest.json');

        if (isManifest) {
            const manifest = getManifest(req.headers.host, configStr);
            res.status(200).json(manifest);
            return;
        }

        // Check if it's a Stream Request
        if (type && id) {
            const streams = await getStreams(type, id, config);
            res.status(200).json({ streams: streams });
            return;
        }

        // Fallback / Homepage check
        res.status(200).send("Cloud Stream Scraper is Active");

    } catch (error) {
        console.error("Handler Fatal Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}
