import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smarttech.ledger',
  appName: 'Smart Technology Ledger',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
