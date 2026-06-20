import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  onBack: () => void;
  right?: ReactNode;
};

export function GlassScreenHeader({ title, onBack, right }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {right ?? <View style={styles.spacer} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
});
