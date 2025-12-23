import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import TabBar, { TabType } from './components/TabBar';
import HomeScreen from './screens/HomeScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import AlertsScreen from './screens/AlertsScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
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
