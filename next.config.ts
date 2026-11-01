import type { NextConfig } from 'next';

const config: NextConfig = {
  devIndicators: false,
  distDir: process.env.VERCEL === '1' ? '.next' : process.env.NODE_ENV === 'production' ? '.next-production' : '.next',
};
export default config;
