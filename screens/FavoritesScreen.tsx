import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusStop } from '../types';
import { getFavorites, removeFavorite } from '../utils/storage';

export default function FavoritesScreen({ navigation }: any) {
  const [favorites, setFavorites] = useState<BusStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('즐겨찾기 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (stopId: string) => {
    await removeFavorite(stopId);
    loadFavorites();
  };

  const handleSelect = (stop: BusStop) => {
    navigation.navigate('Home', { selectedStop: stop });
  };

  const renderItem = ({ item }: { item: BusStop }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.stopName}>{item.name}</Text>
          <TouchableOpacity
            onPress={() => handleRemove(item.id)}
            style={styles.removeButton}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        {item.number && (
          <Text style={styles.stopNumber}>정류장 번호: {item.number}</Text>
        )}
        {item.address && (
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
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
        <Ionicons name="star" size={28} color="#fbbf24" />
        <Text style={styles.headerTitle}>즐겨찾기</Text>
      </View>
      <Text style={styles.headerSubtitle}>
        {favorites.length}개의 정류장이 저장되어 있습니다
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <>
          {renderHeader()}
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>즐겨찾기가 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              정류장을 선택하고 즐겨찾기에 추가해보세요
            </Text>
          </View>
        </>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFavorites();
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
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
    flex: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  stopNumber: {
    fontSize: 14,
    color: '#38bdf8',
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    color: '#9ca3af',
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

