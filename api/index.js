import axios from 'axios';

// --- Configuration ---
const TRACKER_URL = "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt";
const APIBAY_URL = "https://apibay.org/q.php";

// Common User-Agent to mimic a real browser
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// --- In-Memory Cache (Persists only if container is warm) ---
let trackerCache = { data: [], lastUpdated: 0 };

async function getTrackers() {
    const now = Date.now();
    if (now - trackerCache.lastUpdated > 1000 * 60 * 15 || trackerCache.data.length === 0) {
        try {
            console.log("Refreshing trackers...");
            const resp = await axios.get(TRACKER_URL, {
                headers: { 'User-Agent': USER_AGENT }
            });
            trackerCache.data = resp.data.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            trackerCache.lastUpdated = now;
        } catch (e) { 
            console.error("Tracker update failed");
            // Fallback trackers if fetch fails
            if (trackerCache.data.length === 0) {
                trackerCache.data = [
                    "udp://tracker.opentrackr.org:1337/announce",
                    "udp://9.rarbg.com:2810/announce",
                    "udp://tracker.openbittorrent.com:80/announce"
                ];
            }
        }
    }
    return trackerCache.data;
}

function parseConfig(configStr) {
    try {
        if (!configStr) return {};
        let base64 = configStr.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (e) {
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

function getManifest(host) {
    return {
        id: "org.community.cloud.scraper",
        version: "1.2.1",
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
            configurationRequired: false
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

    const trackers = await getTrackers();
    const minSeeds = parseInt(config.minSeeds) || 0;
    const maxGB = parseFloat((config.maxSize || "10").replace(/[^0-9.]/g, ''));
    const allowedRes = Array.isArray(config.res) ? config.res : (config.res ? [config.res] : ['1080p']);
    const maxResultsPerRes = parseInt(config.maxResultsPerRes) || 5;

    try {
        // Fetch from APIBAY with headers
        const { data } = await axios.get(`${APIBAY_URL}?q=${query}&cat=0`, {
            headers: { 'User-Agent': USER_AGENT }
        });

        if (!Array.isArray(data) || data.length === 0 || data[0]?.id === '0') {
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

        return finalStreams.map(t => {
            const trParams = trackers.slice(0, 20).map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
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

// --- Vercel Handler ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req;
    const pathParts = url.split('/').filter(p => p.length > 0);
    
    let configStr = null;
    let isManifest = false;
    let isStream = false;
    
    if (url.includes('manifest.json')) {
        isManifest = true;
        const idx = pathParts.indexOf('manifest.json');
        if (idx > 0) configStr = pathParts[idx - 1];
    } else if (url.includes('/stream/')) {
        isStream = true;
        const streamIdx = pathParts.indexOf('stream');
        if (streamIdx > 0) configStr = pathParts[streamIdx - 1];
    }

    // Default config if missing or homepage
    const config = parseConfig(configStr);

    try {
        if (isManifest) {
            res.status(200).json(getManifest(req.headers.host));
            return;
        }

        if (isStream) {
            const streamIdx = pathParts.indexOf('stream');
            if (streamIdx > -1 && pathParts[streamIdx + 2]) {
                const type = pathParts[streamIdx + 1];
                const idWithExt = pathParts[streamIdx + 2];
                const id = idWithExt.replace('.json', '');
                
                const streams = await getStreams(type, id, config);
                res.status(200).json({ streams });
                return;
            }
        }
        
        // Root fallback
        res.status(200).send("Cloud Stream Scraper API Active");
        
    } catch (error) {
        console.error("Handler Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}
