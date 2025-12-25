import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusStop } from '../types';
import { searchBusStops } from '../utils/busApi';

interface BusStopSearchProps {
  onStopSelect: (stop: BusStop) => void;
  selectedStop: BusStop | null;
}

export default function BusStopSearch({
  onStopSelect,
  selectedStop,
}: BusStopSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BusStop[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchBusStops(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('정류장 검색 오류:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStop = (stop: BusStop) => {
    onStopSelect(stop);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Ionicons name="search" size={18} color="#38bdf8" style={styles.titleIcon} />
        <Text style={styles.title}>정류장 검색</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="정류장 이름 또는 번호 입력"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={handleSearch}
          disabled={isSearching}
          style={[styles.searchButton, isSearching && styles.disabled]}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>검색</Text>
          )}
        </TouchableOpacity>
      </View>

      {selectedStop && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>
            선택된 정류장: {selectedStop.name}
          </Text>
          {selectedStop.number && (
            <Text style={styles.selectedSubtitle}>
              정류장 번호: {selectedStop.number}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => onStopSelect(null as any)}
            style={styles.deselectButton}
          >
            <Text style={styles.deselectText}>선택 해제</Text>
          </TouchableOpacity>
        </View>
      )}

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectStop(item)}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              {item.number && (
                <Text style={styles.resultNumber}>번호: {item.number}</Text>
              )}
              {item.address && (
                <Text style={styles.resultAddress}>{item.address}</Text>
              )}
            </TouchableOpacity>
          )}
          style={styles.resultsList}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 34,
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#e5e7eb',
    backgroundColor: '#020617',
  },
  searchButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#0b1120',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  selectedContainer: {
    backgroundColor: 'rgba(8,47,73,0.95)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  selectedSubtitle: {
    fontSize: 14,
    color: '#bae6fd',
    marginBottom: 8,
  },
  deselectButton: {
    alignSelf: 'flex-start',
  },
  deselectText: {
    fontSize: 12,
    color: '#7dd3fc',
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  resultNumber: {
    fontSize: 14,
    color: '#cbd5f5',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

