import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getCampaignImageUrl,
  markCampaignDismissed,
  type AppCampaign,
} from '../../utils/appCampaign';
import {
  hasTextContent,
  imageHeightPx,
  resolveCampaignDisplay,
} from '../../utils/campaignDisplay';

type Props = {
  campaign: AppCampaign;
  visible: boolean;
  onClose: () => void;
};

export function AppCampaignModal({ campaign, visible, onClose }: Props) {
  const { colors } = useTheme();
  const display = resolveCampaignDisplay(campaign);
  const styles = useMemo(() => createStyles(colors, display), [colors, display]);
  const router = useRouter();
  const image = getCampaignImageUrl(campaign.imageUrl);
  const showText = hasTextContent(campaign, display);
  const showFooter = display.showCtaButton || display.showDismissButton;

  const close = async () => {
    await markCampaignDismissed(campaign);
    onClose();
  };

  const onCta = async () => {
    const action = campaign.cta?.action || 'dismiss_only';
    if (action === 'link' && campaign.cta?.url) {
      const url = campaign.cta.url;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } else if (action === 'route' && campaign.cta?.route) {
      const route = campaign.cta.route.startsWith('/(app)/')
        ? campaign.cta.route
        : campaign.cta.route.startsWith('/')
          ? `/(app)${campaign.cta.route}`
          : `/(app)/${campaign.cta.route}`;
      router.push(route as never);
    }
    await close();
  };

  const heroStyle: StyleProp<ImageStyle> = [
    styles.hero,
    display.imageHeight === 'auto' ? styles.heroAuto : null,
  ];

  const imageNode = image ? (
    <Image
      source={{ uri: image }}
      style={heroStyle}
      contentFit={display.imageFit === 'contain' ? 'contain' : 'cover'}
    />
  ) : (
    <View style={[styles.hero, styles.heroPlaceholder]}>
      <Text style={styles.heroPlaceholderText}>No image</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={close} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>

          {display.imageClickable ? (
            <Pressable onPress={onCta}>{imageNode}</Pressable>
          ) : (
            imageNode
          )}

          {showText ? (
            <View style={styles.body}>
              {display.showBadge && campaign.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{campaign.badge}</Text>
                </View>
              ) : null}
              {display.showTitle && campaign.title ? (
                <Text style={styles.title}>{campaign.title}</Text>
              ) : null}
              {display.showBody && campaign.body ? (
                <Text style={styles.message}>{campaign.body}</Text>
              ) : null}
            </View>
          ) : null}

          {showFooter ? (
            <View style={styles.footer}>
              {display.showCtaButton ? (
                <Pressable style={styles.cta} onPress={onCta}>
                  <Text style={styles.ctaText}>{campaign.cta?.label || 'Learn more'}</Text>
                </Pressable>
              ) : null}
              {display.showDismissButton ? (
                <Pressable onPress={close} style={styles.dismissBtn}>
                  <Text style={styles.dismissText}>Maybe later</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppColors, display: ReturnType<typeof resolveCampaignDisplay>) {
  const heroHeight = imageHeightPx(display.imageHeight);

  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 2,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      width: '100%',
      height: heroHeight,
      backgroundColor: colors.surfaceHover,
    },
    heroAuto: {
      height: undefined,
      minHeight: 180,
      maxHeight: 420,
      aspectRatio: 4 / 5,
    },
    heroPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPlaceholderText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 8,
      gap: 8,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      color: colors.primaryForeground,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 30,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    footer: {
      padding: 20,
      paddingTop: 12,
      gap: 10,
    },
    cta: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
    },
    ctaText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primaryForeground,
    },
    dismissBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    dismissText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
}
