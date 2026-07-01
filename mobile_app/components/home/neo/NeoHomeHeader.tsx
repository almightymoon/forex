import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../AppIcon';
import { greetingForNow } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  firstName: string;
  hasUnread?: boolean;
  onNotifications?: () => void;
};

export function NeoHomeHeader({ firstName, hasUnread, onNotifications }: Props) {
  const { neo } = useTheme();
  const styles = useMemo(() => createStyles(neo), [neo]);

  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text style={styles.greeting}>
          {greetingForNow()}, {firstName}
        </Text>
        <Text style={styles.sub}>Welcome to FX Navigators</Text>
      </View>

      <Pressable style={styles.bellBtn} onPress={onNotifications} hitSlop={8}>
        <AppIcon name="notifications" size={22} color={neo.ink} strokeWidth={1.8} />
        {hasUnread ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  );
}

function createStyles(neo: ReturnType<typeof import('../../../constants/theme').createNeo>) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingTop: 6,
      paddingBottom: 20,
      gap: 12,
    },
    copy: { flex: 1, minWidth: 0 },
    greeting: {
      fontSize: 26,
      fontWeight: '800',
      color: neo.ink,
      letterSpacing: -0.6,
      lineHeight: 32,
    },
    sub: {
      fontSize: 14,
      fontWeight: '500',
      color: neo.inkMuted,
      marginTop: 4,
    },
    bellBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: neo.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: neo.border,
      shadowColor: neo.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 2,
      position: 'relative',
    },
    dot: {
      position: 'absolute',
      top: 10,
      right: 11,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: neo.limeDark,
      borderWidth: 1.5,
      borderColor: neo.card,
    },
  });
}
