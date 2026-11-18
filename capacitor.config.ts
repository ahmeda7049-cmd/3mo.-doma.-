import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.threemodoma.snake',
  appName: '3mo.doma',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#070B12',
    allowMixedContent: false,
  },
};

export default config;
