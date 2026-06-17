import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function hapticLight() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* ignore */ }
}

export async function hapticSuccess() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch { /* ignore */ }
}

export async function hapticError() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch { /* ignore */ }
}
