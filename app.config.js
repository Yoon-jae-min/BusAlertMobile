const { config } = require('dotenv');
const { resolve } = require('path');

// .env 파일을 명시적으로 로드
config({ path: resolve(__dirname, '.env') });

module.exports = {
  expo: {
    name: 'BusAlertMobile',
    slug: 'BusAlertMobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'POST_NOTIFICATIONS',
      ],
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: '버스 정류장까지의 도보 시간을 계산하기 위해 위치 정보가 필요합니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '버스 정류장까지의 도보 시간을 계산하기 위해 위치 정보가 필요합니다.',
      },
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: '버스 정류장까지의 도보 시간을 계산하기 위해 위치 정보가 필요합니다.',
        },
      ],
      'expo-asset',
    ],
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      // 환경변수를 extra로 노출 (선택사항)
      publicDataApiKey: process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY,
      kakaoRestKey: process.env.EXPO_PUBLIC_KAKAO_REST_KEY,
    },
  },
};

