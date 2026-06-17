import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'enrolledCourseIds';

export async function getEnrolledCourseIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function addEnrolledCourseId(courseId: string): Promise<void> {
  try {
    const existing = await getEnrolledCourseIds();
    if (existing.includes(courseId)) return;
    await AsyncStorage.setItem(KEY, JSON.stringify([courseId, ...existing]));
  } catch {
    // ignore
  }
}

