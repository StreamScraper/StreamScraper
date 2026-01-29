export interface ScraperConfig {
  minSeeds: number;
  maxSize: string;
  res: string[];
  maxResultsPerRes: number;
  rdKey: string;
}

export const RESOLUTION_OPTIONS = ['4K', '1080p', '720p', 'SD'] as const;

export const DEFAULT_CONFIG: ScraperConfig = {
  minSeeds: 5,
  maxSize: '10',
  res: ['1080p', '720p', '4K'],
  maxResultsPerRes: 5,
  rdKey: ''
};