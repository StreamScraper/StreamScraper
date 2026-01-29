import React, { useState, useEffect } from 'react';
import { Settings, Shield, Server, Globe, ExternalLink, HardDrive, Zap, Cloud } from 'lucide-react';
import { ScraperConfig, DEFAULT_CONFIG } from './types';
import ConfigForm from './components/ConfigForm';
import InstallSection from './components/InstallSection';
import SearchTester from './components/SearchTester';

const App: React.FC = () => {
  const [config, setConfig] = useState<ScraperConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const initialize = async () => {
      let newConfig = { ...DEFAULT_CONFIG };
      
      const pathParts = window.location.pathname.split('/').filter(p => p.length > 0);
      const manifestIndex = pathParts.findIndex(p => p.includes('manifest.json'));
      let possibleConfig = '';
      
      // Strategy 1: Look for config immediately preceding manifest.json
      if (manifestIndex > 0) {
        possibleConfig = pathParts[manifestIndex - 1];
      } else {
        // Strategy 2: Look for any long segment that isn't a filename (likely the config on a fresh load)
        const candidate = pathParts.find(part => part.length > 10 && !part.includes('.'));
        if (candidate) possibleConfig = candidate;
      }

      if (possibleConfig) {
        try {
           // 1. Normalize Base64 (Restore standard characters)
           let base64 = possibleConfig.replace(/-/g, '+').replace(/_/g, '/');
           // 2. Restore Padding
           while (base64.length % 4) base64 += '=';
           
           // 3. Decode to Binary String
           const binary = atob(base64);
           
           // 4. Convert to Uint8Array (Bytes)
           const bytes = new Uint8Array(binary.length);
           for (let i = 0; i < binary.length; i++) {
               bytes[i] = binary.charCodeAt(i);
           }
           
           // 5. Decode UTF-8
           const json = new TextDecoder().decode(bytes);
           
           // 6. Parse JSON
           const parsed = JSON.parse(json);
           newConfig = { ...newConfig, ...parsed };
           console.log("Configuration successfully loaded from URL.");
        } catch (e) {
           console.warn("Detected a URL segment that looked like a config, but failed to parse it. Reverting to defaults.");
        }
      } else {
        console.log("No configuration found in URL (Homepage). Loading default form.");
      }
      setConfig(newConfig);
    };

    initialize();
  }, []);

  const handleChange = (field: keyof ScraperConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100 font-sans selection:bg-purple-500 selection:text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg shadow-lg shadow-purple-900/20">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                Cloud Stream Scraper
              </h1>
              <p className="text-xs text-gray-400">Customizable Torrent Filter</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-500 border border-gray-800 px-3 py-1 rounded-full">
            <Globe className="w-3 h-3" />
            <span>Web Deployed</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Intro Card */}
        <section className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
          
          <h2 className="text-2xl font-bold mb-4 text-white">Configure Your Addon</h2>
          <p className="text-gray-300 mb-6 leading-relaxed max-w-2xl">
            This tool generates a customized Stremio addon link that runs in the cloud. 
            It filters public trackers based on your seeds/size preferences and supports Real-Debrid for high-speed streaming.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/30 flex flex-col items-center text-center gap-2">
                <Shield className="w-8 h-8 text-green-400 mb-1" />
                <h3 className="font-semibold text-gray-200">Serverless</h3>
                <p className="text-xs text-gray-500">Always online, no local server needed.</p>
             </div>
             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/30 flex flex-col items-center text-center gap-2">
                <HardDrive className="w-8 h-8 text-blue-400 mb-1" />
                <h3 className="font-semibold text-gray-200">Smart Filter</h3>
                <p className="text-xs text-gray-500">Auto-rejects bad seeds or huge files.</p>
             </div>
             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/30 flex flex-col items-center text-center gap-2">
                <Zap className="w-8 h-8 text-yellow-400 mb-1" />
                <h3 className="font-semibold text-gray-200">Debrid Ready</h3>
                <p className="text-xs text-gray-500">Upgrade public torrents to high speed.</p>
             </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold">Configuration</h2>
             </div>
             <ConfigForm config={config} onChange={handleChange} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-pink-400" />
                <h2 className="text-lg font-semibold">Installation</h2>
             </div>
             <InstallSection config={config} />
             <SearchTester config={config} />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;