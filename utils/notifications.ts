import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<boolean> {
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
}

/**
 * 로컬 알림 스케줄링
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerSeconds: number
): Promise<string> {
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
}

/**
 * 예약된 알림 취소
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * 모든 예약된 알림 취소
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

