import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Tab = 'login' | 'signup';

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function AuthTabs({ activeTab, onTabChange }: Props) {
  return (
    <View style={styles.container}>
      {/* Log In */}
      <Pressable style={styles.tabPressable} onPress={() => onTabChange('login')}>
        {activeTab === 'login' ? (
          <LinearGradient
            colors={['#0060E6', '#3AADFF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.tabFill}
          >
            <Text style={styles.tabTextActive}>Log In</Text>
          </LinearGradient>
        ) : (
          <View style={styles.tabFill}>
            <Text style={styles.tabText}>Log In</Text>
          </View>
        )}
      </Pressable>

      {/* Sign Up */}
      <Pressable style={styles.tabPressable} onPress={() => onTabChange('signup')}>
        {activeTab === 'signup' ? (
          <LinearGradient
            colors={['#0060E6', '#3AADFF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.tabFill}
          >
            <Text style={styles.tabTextActive}>Sign Up</Text>
          </LinearGradient>
        ) : (
          <View style={styles.tabFill}>
            <Text style={styles.tabText}>Sign Up</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(8, 20, 48, 0.75)',
    overflow: 'hidden',
    marginBottom: 22,
  },
  tabPressable: {
    flex: 1,
  },
  tabFill: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
