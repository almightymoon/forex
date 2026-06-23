import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CARD_MATERIAL_COLORS,
  CARD_MATERIAL_GROUP_LABELS,
  CARD_MATERIAL_GROUPS,
  isPresetCardMaterialColor,
} from '../../utils/appCardStyle';
import { colorsEqual } from '../../utils/color';

type Props = {
  title: string;
  hint?: string;
  color: string;
  customTitle?: string;
  disabled?: boolean;
  onSelect: (color: string) => void;
  onOpenCustom: () => void;
};

export function CardMaterialColorPicker({
  title,
  hint,
  color,
  customTitle = 'Custom color',
  disabled,
  onSelect,
  onOpenCustom,
}: Props) {
  const isCustom = !isPresetCardMaterialColor(color);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {CARD_MATERIAL_GROUPS.map((group) => {
        const items = CARD_MATERIAL_COLORS.filter((p) => p.group === group);
        if (items.length === 0) return null;
        return (
          <View key={group} style={styles.group}>
            <Text style={styles.groupLabel}>{CARD_MATERIAL_GROUP_LABELS[group]}</Text>
            <View style={styles.colorRow}>
              {items.map((preset) => {
                const active = colorsEqual(color, preset.color);
                return (
                  <Pressable
                    key={`${group}-${preset.color}`}
                    style={[styles.swatch, { backgroundColor: preset.color }, active && styles.swatchActive]}
                    onPress={() => onSelect(preset.color)}
                    disabled={disabled}
                    accessibilityLabel={preset.label}
                  />
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.colorRow}>
        <Pressable
          style={[styles.swatch, styles.customSwatch, isCustom && styles.swatchActive]}
          onPress={onOpenCustom}
          disabled={disabled}
          accessibilityLabel={customTitle}
        >
          <LinearGradient
            colors={['#FF5A5A', '#FFC107', '#4ADE80', '#3AADFF', '#A78BFA', '#FF5A5A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.customGradient}
          />
          <View style={styles.customInner}>
            {isCustom ? (
              <View style={[styles.customFill, { backgroundColor: color }]} />
            ) : (
              <Ionicons name="color-palette" size={18} color="#fff" />
            )}
          </View>
        </Pressable>
      </View>

      <Pressable style={styles.customRow} onPress={onOpenCustom} disabled={disabled}>
        <View style={[styles.customPreview, { backgroundColor: color }]} />
        <View style={styles.customCopy}>
          <Text style={styles.customRowTitle}>{customTitle}</Text>
          <Text style={styles.customHex}>{color.toUpperCase()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.35)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 17,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  group: {
    gap: 8,
    paddingTop: 6,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.32)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  swatchActive: {
    borderColor: '#3AADFF',
    borderWidth: 3,
  },
  customSwatch: {
    padding: 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  customGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  customInner: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(4,8,24,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  customFill: {
    ...StyleSheet.absoluteFillObject,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  customPreview: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  customCopy: {
    flex: 1,
    gap: 2,
  },
  customRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  customHex: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
});
