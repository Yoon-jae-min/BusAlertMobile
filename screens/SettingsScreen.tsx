import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings, AppSettings } from '../utils/storage';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    defaultRadius: 1000,
    alertAdvanceMinutes: 1,
    autoRefresh: true,
    refreshInterval: 30,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await getSettings();
    setSettings(data);
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings({ [key]: value });
  };

  const radiusOptions = [
    { label: '500m', value: 500 },
    { label: '1km', value: 1000 },
    { label: '2km', value: 2000 },
  ];

  const advanceOptions = [
    { label: '30초 전', value: 0.5 },
    { label: '1분 전', value: 1 },
    { label: '2분 전', value: 2 },
    { label: '3분 전', value: 3 },
  ];

  const intervalOptions = [
    { label: '10초', value: 10 },
    { label: '30초', value: 30 },
    { label: '1분', value: 60 },
    { label: '2분', value: 120 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="settings" size={28} color="#38bdf8" />
          <Text style={styles.headerTitle}>설정</Text>
        </View>
        <Text style={styles.headerSubtitle}>앱 사용 환경을 설정하세요</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="location" size={18} color="#38bdf8" style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>검색 반경</Text>
        </View>
        <Text style={styles.sectionDescription}>
          주변 정류장 검색 시 기본 반경을 설정합니다
        </Text>
        <View style={styles.optionsContainer}>
          {radiusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                settings.defaultRadius === option.value && styles.optionButtonActive,
              ]}
              onPress={() => updateSetting('defaultRadius', option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.defaultRadius === option.value && styles.optionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time" size={18} color="#38bdf8" style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>알림 설정</Text>
        </View>
        <Text style={styles.sectionDescription}>
          출발 알림을 몇 분 전에 받을지 설정합니다
        </Text>
        <View style={styles.optionsContainer}>
          {advanceOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                settings.alertAdvanceMinutes === option.value && styles.optionButtonActive,
              ]}
              onPress={() => updateSetting('alertAdvanceMinutes', option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.alertAdvanceMinutes === option.value && styles.optionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>자동 새로고침</Text>
            <Text style={styles.switchDescription}>
              도착 정보를 자동으로 갱신합니다
            </Text>
          </View>
          <Switch
            value={settings.autoRefresh}
            onValueChange={(value) => updateSetting('autoRefresh', value)}
            trackColor={{ false: '#374151', true: '#0ea5e9' }}
            thumbColor={settings.autoRefresh ? '#38bdf8' : '#9ca3af'}
          />
        </View>
      </View>

      {settings.autoRefresh && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="refresh" size={18} color="#38bdf8" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>새로고침 간격</Text>
          </View>
          <Text style={styles.sectionDescription}>
            자동 새로고침 주기를 설정합니다
          </Text>
          <View style={styles.optionsContainer}>
            {intervalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  settings.refreshInterval === option.value && styles.optionButtonActive,
                ]}
                onPress={() => updateSetting('refreshInterval', option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    settings.refreshInterval === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            Alert.alert('초기화', '모든 설정을 초기화하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              {
                text: '확인',
                onPress: async () => {
                  await saveSettings({
                    defaultRadius: 1000,
                    alertAdvanceMinutes: 1,
                    autoRefresh: true,
                    refreshInterval: 30,
                  });
                  loadSettings();
                },
              },
            ]);
          }}
        >
          <Text style={styles.resetButtonText}>설정 초기화</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e5e7eb',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  section: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(55,65,81,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(14,165,233,0.2)',
    borderColor: '#38bdf8',
  },
  optionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  resetButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

