import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DisclaimerBlock } from '../components/DisclaimerBlock';
import { MenuStackHeader } from '../components/navigation/MenuStackHeader';

export default function DisclaimerScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="Disclaimer" subtitle="Important legal notice" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DisclaimerBlock />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
});
