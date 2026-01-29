import React, { useMemo, useState } from 'react';
import { ScraperConfig } from '../types';
import { Download, Copy, Check, ExternalLink, Globe } from 'lucide-react';

interface InstallSectionProps {
  config: ScraperConfig;
}

const InstallSection: React.FC<InstallSectionProps> = ({ config }) => {
  const [copied, setCopied] = useState(false);

  const { installUrl, httpTestUrl } = useMemo(() => {
    const backendConfig = {
      minSeeds: config.minSeeds,
      maxSize: config.maxSize,
      res: config.res, 
      maxResultsPerRes: config.maxResultsPerRes,
      rdKey: config.rdKey,
    };

    // 1. JSON Stringify
    const jsonString = JSON.stringify(backendConfig);
    
    // 2. Encode to UTF-8 Bytes
    const utf8Bytes = new TextEncoder().encode(jsonString);
    
    // 3. Convert Bytes to Binary String (Safe for btoa)
    // Using reduce to avoid stack overflow on very large configs, though unlikely here
    const binaryString = Array.from(utf8Bytes).map(b => String.fromCharCode(b)).join('');
    
    // 4. Base64 Encode
    const base64 = btoa(binaryString);
    
    // 5. Make URL-Safe (RFC 4648)
    const urlSafeConfig = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Detect host and protocol
    const protocol = window.location.protocol; // e.g., 'https:'
    const host = window.location.host; // e.g., 'myapp.vercel.app'
    
    // Stremio link (Protocol is handled by Stremio app, usually starts with stremio://)
    const stremioUrl = `stremio://${host}/${urlSafeConfig}/manifest.json`;
    
    // HTTP Test Link (Respects current protocol)
    const webUrl = `${protocol}//${host}/${urlSafeConfig}/manifest.json`;

    return {
      installUrl: stremioUrl,
      httpTestUrl: webUrl
    };
  }, [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(installUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
      
      <div className="space-y-6">
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase mb-2 block">Generated Addon Link</label>
          <div className="bg-black/50 p-3 rounded-lg border border-gray-700 break-all font-mono text-xs text-gray-400">
            {installUrl}
          </div>
          <button 
            onClick={handleCopy}
            className="mt-2 text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied to clipboard' : 'Copy Link'}
          </button>
        </div>

        <div className="flex gap-3">
          <a
            href={installUrl}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-purple-900/30 transform transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" />
            <span>Install to Stremio</span>
          </a>

          <a
            href={httpTestUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Test Connection in Browser"
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-4 px-4 rounded-xl shadow-lg border border-gray-600 transform transition-all active:scale-95 flex items-center justify-center"
          >
            <Globe className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default InstallSection;