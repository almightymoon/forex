const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send a push notification to a single Expo push token.
 * @returns {Promise<boolean>} true if at least one message was accepted by Expo
 */
async function sendToToken(token, { title, body, data = {} }) {
  const result = await sendToTokens([token], { title, body, data });
  return result.sent > 0;
}

/**
 * Send the same push to many Expo tokens (WhatsApp-style broadcast).
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  const list = (Array.isArray(tokens) ? tokens : [])
    .map((t) => String(t || '').trim())
    .filter((t) => Expo.isExpoPushToken(t));

  if (list.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages = list.map((to) => ({
    to,
    sound: 'default',
    title: title || 'The FX Navigators',
    body: body || '',
    data: data || {},
    priority: 'high',
    channelId: 'default',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          console.error('[ExpoPush] Ticket error:', ticket.message, ticket.details);
        }
      }
    } catch (error) {
      failed += chunk.length;
      console.error('[ExpoPush] Send failed:', error.message);
    }
  }

  return { sent, failed };
}

module.exports = { sendToToken, sendToTokens, Expo };
