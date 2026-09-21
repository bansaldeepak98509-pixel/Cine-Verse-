/// <reference types="@capawesome/capacitor-nodejs" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cineverse.app',
  appName: 'CineVerse',
  webDir: 'dist',
  plugins: {
    Nodejs: {
      nodeDir: 'nodejs',
      startMode: 'auto'
    }
  }
};

export default config;
