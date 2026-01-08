import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TabType = 'home' | 'favorites' | 'alerts' | 'settings';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', label: '홈', icon: 'home-outline', activeIcon: 'home' },
    { key: 'favorites', label: '즐겨찾기', icon: 'star-outline', activeIcon: 'star' },
    { key: 'alerts', label: '알림', icon: 'notifications-outline', activeIcon: 'notifications' },
    { key: 'settings', label: '설정', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? '#38bdf8' : '#9ca3af'}
              style={styles.icon}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.35)',
    paddingVertical: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: 'rgba(14,165,233,0.15)',
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#38bdf8',
    fontWeight: '700',
  },
});

