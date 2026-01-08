import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import TabBar, { TabType } from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export default function App() {
  // 환경변수 디버깅 (개발 중에만 확인)
  useEffect(() => {
    if (__DEV__) {
      console.log('=== 환경변수 확인 ===');
      console.log('process.env keys:', Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')));
      console.log('EXPO_PUBLIC_PUBLIC_DATA_API_KEY:', 
        process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY 
          ? `${process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY.substring(0, 10)}...` 
          : 'undefined');
      console.log('EXPO_PUBLIC_KAKAO_REST_KEY:', 
        process.env.EXPO_PUBLIC_KAKAO_REST_KEY 
          ? `${process.env.EXPO_PUBLIC_KAKAO_REST_KEY.substring(0, 10)}...` 
          : 'undefined');
      console.log('All EXPO_PUBLIC vars:', 
        Object.keys(process.env)
          .filter(key => key.startsWith('EXPO_PUBLIC'))
          .map(key => `${key}=${process.env[key]?.substring(0, 10)}...`)
          .join(', '));
    }
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'favorites':
        return <FavoritesScreen navigation={{ navigate: () => setActiveTab('home') }} />;
      case 'alerts':
        return <AlertsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
  },
});
