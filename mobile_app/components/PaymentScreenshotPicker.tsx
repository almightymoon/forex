import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export type ScreenshotAsset = {
  uri: string;
  name: string;
  type: string;
};

type Props = {
  value: ScreenshotAsset | null;
  onChange: (asset: ScreenshotAsset | null) => void;
  error?: string;
};

export function PaymentScreenshotPicker({ value, onChange, error }: Props) {
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `payment-${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    onChange({ uri: asset.uri, name, type });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Payment Screenshot</Text>
      <Pressable style={[styles.box, error && styles.boxError]} onPress={pick}>
        {value ? (
          <>
            <Image source={{ uri: value.uri }} style={styles.preview} resizeMode="cover" />
            <Pressable style={styles.removeBtn} onPress={() => onChange(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color="#FF5A5A" />
            </Pressable>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={28} color="#3AADFF" />
            <Text style={styles.placeholderText}>Tap to upload screenshot</Text>
            <Text style={styles.placeholderSub}>Required — JPG or PNG</Text>
          </View>
        )}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 8 },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  box: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  boxError: { borderColor: 'rgba(255,90,90,0.5)' },
  preview: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 8, right: 8 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  placeholderText: { fontSize: 14, fontWeight: '600', color: '#3AADFF' },
  placeholderSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.35)' },
  errorText: { fontSize: 12, color: '#FF5A5A' },
});
