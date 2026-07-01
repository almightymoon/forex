import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../components/AuthInput';
import { GradientButton } from '../components/GradientButton';
import { PaymentScreenshotPicker, ScreenshotAsset } from '../components/PaymentScreenshotPicker';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassListCard } from '../components/glass/GlassListCard';
import { useShopCart } from '../contexts/ShopCartContext';
import { apiUpload } from '../utils/api';
import { getStoredUser } from '../utils/auth';
import { hapticSuccess } from '../utils/haptics';
import { formatUsd } from '../utils/publicProducts';
import { cartTotal, loadCart, saveCart, type CartItem } from '../utils/shopCart';

const WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

type PaymentParams = {
  type?: string;
  packageName?: string;
  amount?: string;
  productId?: string;
  productName?: string;
};

export default function PaymentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<PaymentParams>();
  const { clearCart } = useShopCart();

  const paymentType = params.type || 'package';
  const isProductFlow = paymentType === 'product';
  const isCartFlow = paymentType === 'cart';
  const isShopFlow = isProductFlow || isCartFlow;

  const packageName = params.packageName;
  const productId = params.productId || '';
  const productName = params.productName || '';
  const amountParam = Number(params.amount ?? 0);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [txId, setTxId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getStoredUser().then((u) => {
      if (u?.email) setPayerEmail(u.email);
    });
  }, []);

  useEffect(() => {
    if (!isCartFlow) return;
    let alive = true;
    (async () => {
      const items = await loadCart();
      if (!alive) return;
      setCartItems(items);
      if (items.length === 0) {
        router.replace('/(app)/shop/cart' as never);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isCartFlow, router]);

  const displayAmount = isCartFlow ? cartTotal(cartItems) : amountParam;
  const summaryTitle = isCartFlow
    ? `Cart (${cartItems.reduce((n, i) => n + i.quantity, 0)} items)`
    : isProductFlow
      ? productName || 'Product'
      : packageName ?? '—';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(WALLET_ADDRESS);
    setCopied(true);
    toast('Wallet address copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async () => {
    if (!isShopFlow && !packageName) {
      setError('Package name is missing.');
      return;
    }
    if (isProductFlow && !productId) {
      setError('Product is missing.');
      return;
    }
    if (isCartFlow && cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!txId.trim() || txId.trim().length < 10) {
      setError('Transaction ID is required (min 10 characters).');
      return;
    }
    if (!payerName.trim()) {
      setError('Payer name is required');
      return;
    }
    if (!payerEmail.trim()) {
      setError('Payer email is required');
      return;
    }
    if (!screenshot) {
      setError('Payment screenshot is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('transactionId', txId.trim());
      form.append('payerName', payerName.trim());
      form.append('payerEmail', payerEmail.trim());
      form.append('screenshot', {
        uri: screenshot.uri,
        name: screenshot.name,
        type: screenshot.type,
      } as unknown as Blob);

      let endpoint = 'api/payments/submit-package';
      if (isCartFlow) {
        endpoint = 'api/payments/submit-product-cart';
        form.append(
          'items',
          JSON.stringify(cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity }))),
        );
      } else if (isProductFlow) {
        endpoint = 'api/payments/submit-product';
        form.append('productId', productId);
      } else {
        form.append('packageName', packageName!);
      }

      const res = await apiUpload(endpoint, form);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isCartFlow) {
          await saveCart([]);
          clearCart();
        }
        await hapticSuccess();
        router.replace({
          pathname: '/payment-pending',
          params: isShopFlow ? { flow: 'shop' } : {},
        } as never);
      } else {
        const errs = (data as { errors?: Array<{ msg: string }> }).errors;
        setError(
          errs?.[0]?.msg ??
            (data as { message?: string; error?: string }).message ??
            (data as { error?: string }).error ??
            'Submission failed. Please try again.',
        );
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Complete Payment</Text>
              <Text style={styles.subtitle}>
                Send USDT (TRC20) to the address below then submit your transaction details
              </Text>
            </View>

            <GlassListCard contentStyle={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isShopFlow ? 'Order' : 'Package'}</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {summaryTitle}
                </Text>
              </View>
              {isCartFlow
                ? cartItems.map((item) => (
                    <View key={item.productId} style={styles.cartLine}>
                      <Text style={styles.cartLineName} numberOfLines={1}>
                        {item.quantity}× {item.name}
                      </Text>
                      <Text style={styles.cartLinePrice}>{formatUsd(item.price * item.quantity)}</Text>
                    </View>
                  ))
                : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount</Text>
                <Text style={styles.amountValue}>{formatUsd(displayAmount)} USDT</Text>
              </View>
            </GlassListCard>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>USDT (TRC20) Wallet Address</Text>
              <Pressable style={styles.walletRow} onPress={handleCopy}>
                <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                  {WALLET_ADDRESS}
                </Text>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#4ADE80' : colors.brandBlue} />
              </Pressable>
              <Text style={styles.walletNote}>Tap to copy. Send exact amount to this address.</Text>
            </View>

            <AuthInput
              label="Transaction ID / Hash"
              icon="receipt-outline"
              placeholder="Paste your transaction ID here"
              autoCapitalize="none"
              autoCorrect={false}
              value={txId}
              onChangeText={(v) => {
                setTxId(v);
                setError('');
              }}
            />
            <AuthInput
              label="Payer Name"
              icon="person-outline"
              placeholder="Name as shown on your exchange"
              autoCapitalize="words"
              value={payerName}
              onChangeText={(v) => {
                setPayerName(v);
                setError('');
              }}
            />
            <AuthInput
              label="Payer Email"
              icon="mail-outline"
              placeholder="your@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={payerEmail}
              onChangeText={(v) => {
                setPayerEmail(v);
                setError('');
              }}
            />
            <PaymentScreenshotPicker value={screenshot} onChange={setScreenshot} />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF5A5A" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <GradientButton title="Submit Payment Proof" loading={loading} onPress={handleSubmit} />

            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.noticeText}>
                Your payment will be reviewed within 24 hours. Do not send from an exchange that doesn&apos;t support TRC20.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 22,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13.5,
      color: colors.textMuted,
      lineHeight: 20,
    },
    summaryCard: {
      padding: 16,
      marginBottom: 20,
      gap: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    summaryLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    cartLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      paddingLeft: 4,
    },
    cartLineName: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
    },
    cartLinePrice: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    amountValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.brandBlue,
    },
    section: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    walletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceHover,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(58,173,255,0.3)',
      padding: 14,
      gap: 10,
    },
    walletAddress: {
      flex: 1,
      fontSize: 13.5,
      color: colors.brandBlue,
      fontWeight: '500',
    },
    walletNote: {
      fontSize: 11.5,
      color: colors.textDim,
      marginTop: 6,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,90,90,0.1)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,90,90,0.2)',
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: '#FF5A5A',
    },
    notice: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 18,
      paddingHorizontal: 4,
    },
    noticeText: {
      flex: 1,
      fontSize: 12,
      color: colors.textDim,
      lineHeight: 18,
    },
  });
}
