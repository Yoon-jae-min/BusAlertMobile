import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAlertHistory, AlertHistoryItem } from '../utils/storage';

export default function AlertsScreen() {
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await getAlertHistory();
      setHistory(data);
    } catch (error) {
      console.error('알림 히스토리 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: AlertHistoryItem }) => (
    <View style={[styles.card, item.completed && styles.completedCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{item.routeName}</Text>
          <Text style={styles.stopName}>{item.busStopName}</Text>
        </View>
        {item.completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>완료</Text>
          </View>
        )}
      </View>
      <View style={styles.timeInfo}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>알림 시간:</Text>
          <Text style={styles.timeValue}>{item.alertTime}</Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>출발 시간:</Text>
          <Text style={styles.departureValue}>{item.departureTime}</Text>
        </View>
      </View>
      <Text style={styles.timestamp}>{formatDate(item.alertTime)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTitleRow}>
        <Ionicons name="notifications" size={28} color="#38bdf8" />
        <Text style={styles.headerTitle}>알림 히스토리</Text>
      </View>
      <Text style={styles.headerSubtitle}>
        설정한 알림 기록을 확인할 수 있습니다
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <>
          {renderHeader()}
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>알림 기록이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              버스 출발 알림을 설정하면 여기에 기록됩니다
            </Text>
          </View>
        </>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadHistory();
              }}
              tintColor="#38bdf8"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 14,
  },
  header: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.35)',
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
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 18,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  completedCard: {
    opacity: 0.6,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 4,
  },
  stopName: {
    fontSize: 14,
    color: '#9ca3af',
  },
  completedBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  timeInfo: {
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  timeValue: {
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  departureValue: {
    fontSize: 15,
    color: '#f97316',
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

