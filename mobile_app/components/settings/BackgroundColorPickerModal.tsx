import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  clamp,
  hexToHsv,
  hsvToHex,
  hueColor,
  normalizeHex,
  type Hsv,
} from '../../utils/color';
import { GradientButton } from '../GradientButton';

type Props = {
  visible: boolean;
  initialColor: string;
  onClose: () => void;
  onApply: (hex: string) => void;
};

const PANEL_HEIGHT = 220;
const HUE_HEIGHT = 28;
const THUMB = 22;

function pickFromPanel(locationX: number, locationY: number, width: number, height: number): Pick<Hsv, 's' | 'v'> {
  return {
    s: clamp(locationX / width, 0, 1),
    v: clamp(1 - locationY / height, 0, 1),
  };
}

function pickHue(locationX: number, width: number): number {
  return clamp((locationX / width) * 360, 0, 360);
}

export function BackgroundColorPickerModal({ visible, initialColor, onClose, onApply }: Props) {  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { width: screenW } = useWindowDimensions();
  const panelWidth = Math.min(screenW - 48, 320);

  const initialHsv = useMemo(() => {
    return hexToHsv(initialColor) ?? { h: 220, s: 0.85, v: 0.15 };
  }, [initialColor]);

  const [hsv, setHsv] = useState<Hsv>(initialHsv);
  const [hexInput, setHexInput] = useState(hsvToHex(initialHsv));
  const [hexError, setHexError] = useState('');

  const panelLayout = useRef({ width: panelWidth, height: PANEL_HEIGHT });
  const hueLayout = useRef({ width: panelWidth, height: HUE_HEIGHT });
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  useEffect(() => {
    if (!visible) return;
    const next = hexToHsv(initialColor) ?? initialHsv;
    setHsv(next);
    setHexInput(hsvToHex(next));
    setHexError('');
  }, [visible, initialColor, initialHsv]);

  const previewColor = hsvToHex(hsv);
  const baseHue = hueColor(hsv.h);

  const updateHsv = (next: Hsv) => {
    setHsv(next);
    setHexInput(hsvToHex(next));
    setHexError('');
  };

  const panelPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const { width, height } = panelLayout.current;
          const picked = pickFromPanel(locationX, locationY, width, height);
          updateHsv({ ...hsvRef.current, ...picked });
        },
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const { width, height } = panelLayout.current;
          const picked = pickFromPanel(locationX, locationY, width, height);
          updateHsv({ ...hsvRef.current, ...picked });
        },
      }),
    [],
  );

  const huePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX } = e.nativeEvent;
          const { width } = hueLayout.current;
          updateHsv({ ...hsvRef.current, h: pickHue(locationX, width) });
        },
        onPanResponderMove: (e) => {
          const { locationX } = e.nativeEvent;
          const { width } = hueLayout.current;
          updateHsv({ ...hsvRef.current, h: pickHue(locationX, width) });
        },
      }),
    [],
  );

  const handleHexChange = (value: string) => {
    const raw = value.replace(/[^0-9a-fA-F#]/g, '');
    const withHash = raw.startsWith('#') ? raw : raw ? `#${raw}` : '#';
    setHexInput(withHash.slice(0, 7));

    const normalized = normalizeHex(withHash);
    if (!normalized) {
      setHexError(withHash.length >= 4 ? 'Invalid hex color' : '');
      return;
    }

    const parsed = hexToHsv(normalized);
    if (parsed) {
      setHsv(parsed);
      setHexError('');
    }
  };

  const handleApply = () => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      setHexError('Enter a valid hex color (e.g. #036FFC)');
      return;
    }
    onApply(normalized);
    onClose();
  };

  const thumbLeft = hsv.s * panelWidth - THUMB / 2;
  const thumbTop = (1 - hsv.v) * PANEL_HEIGHT - THUMB / 2;
  const hueThumbLeft = (hsv.h / 360) * panelWidth - THUMB / 2;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.header}>
            <Text style={styles.title}>Custom Color</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={styles.body}>
          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: previewColor }]} />
            <View style={styles.previewCopy}>
              <Text style={styles.previewLabel}>Background preview</Text>
              <Text style={styles.previewHex}>{previewColor}</Text>
            </View>
          </View>

          <View
            style={[styles.panel, { width: panelWidth, height: PANEL_HEIGHT }]}
            onLayout={(e) => {
              panelLayout.current = {
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              };
            }}
            {...panelPan.panHandlers}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: baseHue }]} />
            <LinearGradient
              colors={['#FFFFFF', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', '#000000']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View
              style={[
                styles.thumb,
                {
                  left: clamp(thumbLeft, -4, panelWidth - THUMB + 4),
                  top: clamp(thumbTop, -4, PANEL_HEIGHT - THUMB + 4),
                  borderColor: hsv.v > 0.55 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.85)',
                },
              ]}
              pointerEvents="none"
            />
          </View>

          <View
            style={[styles.hueTrack, { width: panelWidth }]}
            onLayout={(e) => {
              hueLayout.current = {
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              };
            }}
            {...huePan.panHandlers}
          >
            <LinearGradient
              colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.hueThumb,
                { left: clamp(hueThumbLeft, 0, panelWidth - THUMB) },
              ]}
              pointerEvents="none"
            />
          </View>

          <View style={styles.hexRow}>
            <Text style={styles.hexLabel}>Hex</Text>
            <TextInput
              style={[styles.hexInput, hexError ? styles.hexInputError : null]}
              value={hexInput}
              onChangeText={handleHexChange}
              placeholder="#036FFC"
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
            />
          </View>
          {hexError ? <Text style={styles.hexError}>{hexError}</Text> : null}

          <Text style={styles.hint}>
            Drag the square to adjust saturation and brightness, or use the rainbow bar to change hue — just like Discord.
          </Text>

          <GradientButton title="Apply Color" onPress={handleApply} style={styles.applyBtn} />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceHover,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  previewSwatch: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  previewCopy: {
    flex: 1,
    gap: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  previewHex: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  panel: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  hueTrack: {
    height: HUE_HEIGHT,
    borderRadius: HUE_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hueThumb: {
    position: 'absolute',
    top: 3,
    width: THUMB,
    height: HUE_HEIGHT - 6,
    borderRadius: (HUE_HEIGHT - 6) / 2,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: colors.surfaceHover,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 12,
  },
  hexLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 36,
  },
  hexInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1.2,
  },
  hexInputError: {
    borderColor: 'rgba(255,90,90,0.55)',
  },
  hexError: {
    alignSelf: 'stretch',
    fontSize: 12,
    color: '#FF5A5A',
    marginTop: -8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  applyBtn: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
}
