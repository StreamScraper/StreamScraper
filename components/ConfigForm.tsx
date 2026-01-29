import React from 'react';
import { ScraperConfig, RESOLUTION_OPTIONS } from '../types';
import { Key, Signal, Database, Monitor, Info, ListFilter } from 'lucide-react';

interface ConfigFormProps {
  config: ScraperConfig;
  onChange: (field: keyof ScraperConfig, value: any) => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ config, onChange }) => {
  
  const toggleResolution = (res: string) => {
    const current = config.res || [];
    if (current.includes(res)) {
      onChange('res', current.filter(r => r !== res));
    } else {
      onChange('res', [...current, res]);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl space-y-6">
      
      {/* Scraper Settings */}
      <div className="space-y-4 pb-6 border-b border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4" /> Filter Rules
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 block flex items-center gap-1">
              <Signal className="w-3 h-3" /> Min Seeds
            </label>
            <input
              type="number"
              min="0"
              value={config.minSeeds}
              onChange={(e) => onChange('minSeeds', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 block flex items-center gap-1">
              <Database className="w-3 h-3" /> Max Size (GB)
            </label>
            <input
              type="text"
              value={config.maxSize}
              onChange={(e) => onChange('maxSize', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
        
        <div className="space-y-1">
           <label className="text-xs text-gray-400 block flex items-center gap-1">
              <ListFilter className="w-3 h-3" /> Max Results per Quality
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.maxResultsPerRes || 5}
              onChange={(e) => onChange('maxResultsPerRes', parseInt(e.target.value) || 5)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 block flex items-center gap-1">
            <Monitor className="w-3 h-3" /> Allowed Resolutions
          </label>
          <div className="grid grid-cols-4 gap-2">
            {RESOLUTION_OPTIONS.map((res) => {
              const isActive = config.res.includes(res);
              return (
                <button
                  key={res}
                  onClick={() => toggleResolution(res)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                    isActive
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real Debrid */}
      <div className="space-y-2">
         <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4" /> Real-Debrid
        </h3>
         <div className="relative group">
            <input
              type="password"
              value={config.rdKey}
              onChange={(e) => onChange('rdKey', e.target.value)}
              placeholder="API Key (Optional)"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-3 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
               <Key className="w-4 h-4" />
            </div>
         </div>
         <div className="flex items-start gap-2 mt-2 bg-blue-900/20 p-3 rounded-lg border border-blue-900/30">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-200">
               If provided, links will be un-restricted via Real-Debrid servers for max speed.
               <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline ml-1">Get Key</a>
            </p>
         </div>
      </div>

    </div>
  );
};

export default ConfigForm;