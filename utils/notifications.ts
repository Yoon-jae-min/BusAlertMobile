import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go 환경인지 확인
const isExpoGo = Constants.appOwnership === 'expo';

// Expo Go가 아닐 때만 expo-notifications import
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('expo-notifications를 사용할 수 없습니다.');
  }
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // Expo Go에서는 알림을 사용할 수 없음
  if (isExpoGo || !Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Android에서 알림 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '버스 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.warn('알림 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 로컬 알림 스케줄링
 * Expo Go에서는 작동하지 않으므로 false 반환
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerSeconds: number
): Promise<string | false> {
  // Expo Go에서는 알림을 사용할 수 없음
  if (isExpoGo || !Notifications) {
    return false;
  }

  try {
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
      throw new Error('알림 권한이 필요합니다.');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: triggerSeconds,
      },
    });

    return notificationId;
  } catch (error) {
    console.warn('알림 스케줄링 실패:', error);
    return false;
  }
}

/**
 * 예약된 알림 취소
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('알림 취소 실패:', error);
  }
}

/**
 * 모든 예약된 알림 취소
 */
export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('알림 취소 실패:', error);
  }
}

/**
 * Expo Go 환경인지 확인
 */
export function isExpoGoEnvironment(): boolean {
  return isExpoGo;
}

