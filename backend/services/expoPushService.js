const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/** Default TTL: 24h so offline devices still receive signal alerts later. */
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

/**
 * Send a push notification to a single Expo push token.
 * @returns {Promise<boolean>} true if at least one message was accepted by Expo
 */
async function sendToToken(token, options) {
  const result = await sendToTokens([token], options);
  return result.sent > 0;
}

/**
 * Clear stale Expo push tokens from user preferences after failed receipts.
 * @param {string[]} invalidTokens
 */
async function clearInvalidPushTokens(invalidTokens) {
  const tokens = [...new Set((invalidTokens || []).map((t) => String(t || '').trim()).filter(Boolean))];
  if (tokens.length === 0) return;

  try {
    const User = require('../models/User');
    const result = await User.updateMany(
      { 'preferences.expoPushToken': { $in: tokens } },
      { $unset: { 'preferences.expoPushToken': '' } }
    );
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    if (modified > 0) {
      console.warn(`[ExpoPush] Cleared ${modified} stale push token(s) from user preferences`);
    }
  } catch (error) {
    console.error('[ExpoPush] Failed to clear invalid tokens:', error.message);
  }
}

/**
 * Poll Expo receipts for ticket IDs and clear DeviceNotRegistered tokens.
 * @param {Array<{ ticketId: string, to: string }>} ticketMap
 */
async function processPushReceipts(ticketMap) {
  if (!ticketMap || ticketMap.length === 0) return;

  const receiptIds = ticketMap.map((t) => t.ticketId).filter(Boolean);
  if (receiptIds.length === 0) return;

  // Expo recommends waiting briefly before fetching receipts
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const invalidTokens = [];
  const idChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (const chunk of idChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [id, receipt] of Object.entries(receipts || {})) {
        if (!receipt || receipt.status === 'ok') continue;

        const details = receipt.details || {};
        const errorCode = details.error || receipt.message || 'unknown';
        console.error('[ExpoPush] Receipt error:', id, errorCode, receipt.message);

        if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
          const mapped = ticketMap.find((t) => t.ticketId === id);
          if (mapped?.to) invalidTokens.push(mapped.to);
        }
      }
    } catch (error) {
      console.error('[ExpoPush] Receipt fetch failed:', error.message);
    }
  }

  if (invalidTokens.length > 0) {
    await clearInvalidPushTokens(invalidTokens);
  }
}

/**
 * Send the same push to many Expo tokens (WhatsApp-style broadcast).
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendToTokens(
  tokens,
  {
    title,
    body,
    data = {},
    channelId = 'default',
    ttl = DEFAULT_TTL_SECONDS,
    interruptionLevel = 'timeSensitive',
  } = {}
) {
  const list = (Array.isArray(tokens) ? tokens : [])
    .map((t) => String(t || '').trim())
    .filter((t) => Expo.isExpoPushToken(t));

  // Dedupe — same device token stored on multiple accounts would spam Expo
  const unique = [...new Set(list)];

  if (unique.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages = unique.map((to) => ({
    to,
    sound: 'default',
    title: title || 'The FX Navigators',
    body: body || '',
    data: data || {},
    priority: 'high',
    channelId: channelId || 'default',
    // Deliver for up to 24h if the device is offline
    ttl: typeof ttl === 'number' ? ttl : DEFAULT_TTL_SECONDS,
    // iOS Focus / DND: treat as time-sensitive (WhatsApp-like urgency)
    interruptionLevel: interruptionLevel || 'timeSensitive',
    _contentAvailable: true,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  let failed = 0;
  /** @type {Array<{ ticketId: string, to: string }>} */
  const ticketMap = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i];
        const to = chunk[i]?.to;
        if (ticket.status === 'ok') {
          sent += 1;
          if (ticket.id && to) {
            ticketMap.push({ ticketId: ticket.id, to });
          }
        } else {
          failed += 1;
          console.error('[ExpoPush] Ticket error:', ticket.message, ticket.details);
          const errCode = ticket.details?.error;
          if (
            to &&
            (errCode === 'DeviceNotRegistered' || errCode === 'InvalidCredentials')
          ) {
            // Clear immediately when ticket itself reports invalid device
            await clearInvalidPushTokens([to]);
          }
        }
      }
    } catch (error) {
      failed += chunk.length;
      console.error('[ExpoPush] Send failed:', error.message);
    }
  }

  // Fire-and-forget receipt polling — do not block the HTTP response path
  if (ticketMap.length > 0) {
    void processPushReceipts(ticketMap).catch((err) => {
      console.error('[ExpoPush] Receipt processing failed:', err.message);
    });
  }

  return { sent, failed };
}

module.exports = {
  sendToToken,
  sendToTokens,
  clearInvalidPushTokens,
  processPushReceipts,
  Expo,
  DEFAULT_TTL_SECONDS,
};
