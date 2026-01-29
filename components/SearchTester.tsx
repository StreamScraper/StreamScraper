import React, { useState, useEffect } from 'react';
import { ScraperConfig } from '../types';
import { Play, AlertCircle, Loader2, Database, Download, Network, Magnet } from 'lucide-react';

interface SearchTesterProps {
  config: ScraperConfig;
}

interface StreamResult {
  title: string;
  size: string;
  seeds: number;
  hash: string;
  res: string;
}

const TRACKER_URL = "https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt";

const SearchTester: React.FC<SearchTesterProps> = ({ config }) => {
  const [query, setQuery] = useState('tt0133093'); // Matrix Default
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StreamResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackers, setTrackers] = useState<string[]>([]);

  // Parse Config Limits
  const minSeeds = config.minSeeds || 0;
  const maxBytes = parseFloat(config.maxSize.replace(/[^0-9.]/g, '')) * 1073741824;
  const maxResultsPerRes = config.maxResultsPerRes || 5;

  // Load trackers on mount
  useEffect(() => {
    fetch(TRACKER_URL)
      .then(res => res.text())
      .then(text => {
        const list = text.split('\n').filter(l => l.trim().length > 0);
        setTrackers(list);
      })
      .catch(e => console.error("Failed to load trackers in browser", e));
  }, []);

  const getResolution = (title: string): string => {
    const t = title.toUpperCase();
    if (t.includes('2160P') || t.includes('4K')) return '4K';
    if (t.includes('1080P')) return '1080p';
    if (t.includes('720P')) return '720p';
    return 'SD';
  };

  const getMagnetLink = (hash: string, title: string) => {
    const trackerParams = trackers.slice(0, 20).map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
    return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}${trackerParams}`;
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // 1. Search Index (APIBAY) via Proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://apibay.org/q.php?q=${query}&cat=0`)}`;
      
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Failed to contact index provider");
      
      const data = await res.json();
      
      if (!Array.isArray(data) || (data.length === 1 && data[0].id === '0')) {
        throw new Error("No results found for this ID.");
      }

      // 2. Filter Client Side (First Pass)
      const validStreams = data.filter((t: any) => {
          const size = parseInt(t.size);
          const seeds = parseInt(t.seeders);

          if (seeds < minSeeds) return false;
          if (size > maxBytes) return false;
          return true;
      });

      // 3. Group and Limit by Resolution
      const grouped: {[key: string]: any[]} = { '4K': [], '1080p': [], '720p': [], 'SD': [] };
      
      validStreams.forEach((t: any) => {
        const resolution = getResolution(t.name);
        if (config.res.includes(resolution)) {
            grouped[resolution].push(t);
        }
      });

      let finalResults: StreamResult[] = [];
      ['4K', '1080p', '720p', 'SD'].forEach(key => {
         const sorted = grouped[key].sort((a, b) => parseInt(b.seeders) - parseInt(a.seeders));
         const sliced = sorted.slice(0, maxResultsPerRes);
         
         const mapped = sliced.map((t: any) => ({
             title: t.name,
             size: (parseInt(t.size) / (1024 * 1024)).toFixed(0) + ' MB',
             seeds: parseInt(t.seeders),
             hash: t.info_hash,
             res: key
         }));
         finalResults = [...finalResults, ...mapped];
      });


      if (finalResults.length === 0) {
        setError("Torrents found, but all were filtered out by your settings (Size/Seeds/Resolution).");
      } else {
        setResults(finalResults);
      }

    } catch (err: any) {
      setError(err.message || "Scraping failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-700/50 pb-4 justify-between">
        <div className="flex items-center gap-2">
            <div className="bg-green-600/20 p-2 rounded-lg">
                <Network className="w-5 h-5 text-green-400" />
            </div>
            <div>
            <h2 className="text-lg font-semibold text-gray-100">Live Indexer</h2>
            <p className="text-xs text-gray-400">Scrapes trackers list + Index</p>
            </div>
        </div>
        <div className="text-right">
             <span className="text-xs font-mono text-gray-500 uppercase">Active Trackers</span>
             <p className="text-xl font-bold text-purple-400">{trackers.length > 0 ? trackers.length : '...'}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="IMDb ID (e.g. tt0133093)"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
        />
        <button 
          onClick={handleTest}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          Search
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-200 text-xs p-3 rounded-lg flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Result Info</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded border border-green-900/30">
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Found {results.length} streams</span>
            {config.rdKey && <span className="flex items-center gap-1"><Download className="w-3 h-3" /> RD Ready</span>}
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {results.map((stream, idx) => (
              <a 
                key={idx} 
                href={getMagnetLink(stream.hash, stream.title)}
                className="block bg-gray-900 p-3 rounded border border-gray-800 text-sm hover:border-green-500/50 hover:bg-gray-800 transition-all flex justify-between items-center group cursor-pointer"
              >
                <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-900/40 text-green-400 flex items-center gap-1">
                           <Magnet className="w-3 h-3" /> {stream.res}
                        </span>
                        <p className="font-medium text-gray-200 truncate group-hover:text-white" title={stream.title}>{stream.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                        <span className="min-w-[4rem]">{stream.size}</span>
                        <span className="text-green-500">{stream.seeds} seeds</span>
                        <span className="text-gray-600 truncate max-w-[100px]">{stream.hash}</span>
                    </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchTester;