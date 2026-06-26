import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { DISCLAIMER_PARAGRAPHS, DISCLAIMER_TITLE } from '../constants/disclaimer';

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DisclaimerBlock({ compact = false, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View style={styles.titleRow}>
        <View style={styles.iconWell}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.black} />
        </View>
        <Text style={styles.title}>{DISCLAIMER_TITLE}</Text>
      </View>

      {DISCLAIMER_PARAGRAPHS.map((paragraph, index) => (
        <Text key={index} style={[styles.body, compact && styles.bodyCompact]}>
          {'parts' in paragraph
            ? paragraph.parts.map((part, i) =>
                'bold' in part && part.bold ? (
                  <Text key={i} style={styles.bold}>
                    {part.text}
                  </Text>
                ) : (
                  part.text
                ),
              )
            : paragraph.text}
        </Text>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  wrapCompact: {
    padding: 14,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
});
}
