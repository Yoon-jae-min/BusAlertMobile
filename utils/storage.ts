import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusStop, AlertSetting } from '../types';

const STORAGE_KEYS = {
  FAVORITES: '@busalert:favorites',
  RECENT_SEARCHES: '@busalert:recent_searches',
  ALERT_HISTORY: '@busalert:alert_history',
  SETTINGS: '@busalert:settings',
};

// 즐겨찾기 정류장
export async function getFavorites(): Promise<BusStop[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('즐겨찾기 불러오기 실패:', error);
    return [];
  }
}

export async function saveFavorite(stop: BusStop): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const exists = favorites.some((f) => f.id === stop.id);
    if (!exists) {
      favorites.push(stop);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
    return true;
  } catch (error) {
    console.error('즐겨찾기 저장 실패:', error);
    return false;
  }
}

export async function removeFavorite(stopId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter((f) => f.id !== stopId);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('즐겨찾기 삭제 실패:', error);
    return false;
  }
}

export async function isFavorite(stopId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.some((f) => f.id === stopId);
  } catch (error) {
    return false;
  }
}

// 최근 검색 기록
export async function getRecentSearches(): Promise<BusStop[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

export async function addRecentSearch(stop: BusStop): Promise<void> {
  try {
    const recent = await getRecentSearches();
    const filtered = recent.filter((r) => r.id !== stop.id);
    filtered.unshift(stop);
    const limited = filtered.slice(0, 10); // 최대 10개
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(limited));
  } catch (error) {
    console.error('최근 검색 저장 실패:', error);
  }
}

// 알림 히스토리
export interface AlertHistoryItem {
  id: string;
  busStopName: string;
  routeName: string;
  alertTime: string;
  departureTime: string;
  completed: boolean;
}

export async function getAlertHistory(): Promise<AlertHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

export async function addAlertHistory(item: AlertHistoryItem): Promise<void> {
  try {
    const history = await getAlertHistory();
    history.unshift(item);
    const limited = history.slice(0, 50); // 최대 50개
    await AsyncStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(limited));
  } catch (error) {
    console.error('알림 히스토리 저장 실패:', error);
  }
}

// 설정
export interface AppSettings {
  defaultRadius: number;
  alertAdvanceMinutes: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultRadius: 1000,
  alertAdvanceMinutes: 1,
  autoRefresh: true,
  refreshInterval: 30,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<boolean> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('설정 저장 실패:', error);
    return false;
  }
}

