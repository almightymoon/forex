import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { recordCrashLog } from '../utils/crashReporter';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        The app hit an unexpected error. You can try again — a report was saved and will be sent
        when you are back online.
      </Text>
      <Pressable style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** Catches render errors so a single screen bug does not hard-crash the app. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    void recordCrashLog('error_boundary', error, { componentStack: info.componentStack ?? undefined });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    btn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    btnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryForeground,
    },
  });
}
