import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { DISCLAIMER_PARAGRAPHS, DISCLAIMER_TITLE } from '../constants/disclaimer';

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DisclaimerBlock({ compact = false, style }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <Text style={styles.title}>{DISCLAIMER_TITLE}</Text>

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

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,8,20,0.72)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 16,
  },
  wrapCompact: {
    padding: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22,
    marginBottom: 14,
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
