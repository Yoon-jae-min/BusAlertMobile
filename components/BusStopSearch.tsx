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
      <Text style={styles.title}>🔍 정류장 검색</Text>

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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  selectedContainer: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  selectedSubtitle: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 8,
  },
  deselectButton: {
    alignSelf: 'flex-start',
  },
  deselectText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  resultNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

