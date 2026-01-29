import React, { useState, useEffect } from 'react';
import { ScraperConfig } from '../types';
import { Play, AlertCircle, Loader2, Database, Download, Network, Magnet } from 'lucide-react';

interface SearchTesterProps {
  config: ScraperConfig;
}

interface StreamResult {
  title: string;
  name: string;
  url: string;
}

const SearchTester: React.FC<SearchTesterProps> = ({ config }) => {
  const [query, setQuery] = useState('tt0133093'); // Matrix Default
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StreamResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper: Generate the current config string
  const getConfigString = () => {
    const backendConfig = {
      minSeeds: config.minSeeds,
      maxSize: config.maxSize,
      res: config.res, 
      maxResultsPerRes: config.maxResultsPerRes,
      rdKey: config.rdKey,
    };
    const jsonString = JSON.stringify(backendConfig);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const binaryString = Array.from(utf8Bytes).map(b => String.fromCharCode(b)).join('');
    const base64 = btoa(binaryString);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Use the actual deployed backend or local dev server
      // This path mimics exactly what Stremio calls
      const urlSafeConfig = getConfigString();
      const endpoint = `/${urlSafeConfig}/stream/movie/${query}.json`;
      
      console.log("Testing endpoint:", endpoint);

      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (!data.streams || data.streams.length === 0) {
        setError("No streams found. Try adjusting your filters (Seeds/Size) or checking the ID.");
      } else {
        setResults(data.streams);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Request failed. Ensure the app is deployed or running locally.");
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
            <h2 className="text-lg font-semibold text-gray-100">Live Backend Test</h2>
            <p className="text-xs text-gray-400">Verifies scraping logic on the server</p>
            </div>
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
          Test Scrape
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-200 text-xs p-3 rounded-lg flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Test Failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded border border-green-900/30">
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Found {results.length} streams</span>
            {config.rdKey && <span className="flex items-center gap-1"><Download className="w-3 h-3" /> RD Enabled</span>}
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {results.map((stream, idx) => (
              <a 
                key={idx} 
                href={stream.url}
                className="block bg-gray-900 p-3 rounded border border-gray-800 text-sm hover:border-green-500/50 hover:bg-gray-800 transition-all flex justify-between items-center group cursor-pointer"
              >
                <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-200 truncate group-hover:text-white whitespace-pre-line" title={stream.title}>{stream.title}</p>
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
