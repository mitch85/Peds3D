import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.petpal3d.app',
  appName: 'PetPal 3D',
  webDir: 'dist',
  backgroundColor: '#fdf2f8',
  ios: {
    contentInset: 'never',
  },
  android: {
    backgroundColor: '#fdf2f8',
  },
};

export default config;
