// 간단한 테스트 버전 - 이 파일로 문제를 진단할 수 있습니다
// App.tsx를 이 내용으로 교체해서 테스트하세요

import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚌 버스 도착 알림</Text>
        <Text style={styles.subtitle}>테스트 버전</Text>
        <Text style={styles.text}>앱이 정상적으로 로드되었습니다!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#3b82f6',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

