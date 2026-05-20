import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Artisan',
  slug: 'artisan-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'artisan',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2563EB',
  },
  ios: {
    bundleIdentifier: 'app.artisan.mobile',
    supportsTablet: false,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Show nearby artisans on the map.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Share live location with the customer during an active job.',
    },
  },
  android: {
    package: 'app.artisan.mobile',
    adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#2563EB' },
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-location'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
  },
  experiments: { typedRoutes: true },
};

export default config;
