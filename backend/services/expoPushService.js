const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send a push notification to a single Expo push token.
 * @returns {Promise<boolean>} true if at least one message was accepted by Expo
 */
async function sendToToken(token, { title, body, data = {} }) {
  if (!token || !Expo.isExpoPushToken(token)) {
    console.warn('[ExpoPush] Invalid or missing push token');
    return false;
  }

  const messages = [
    {
      to: token,
      sound: 'default',
      title: title || 'The FX Navigators',
      body: body || '',
      data: data || {},
      priority: 'high',
      channelId: 'default',
    },
  ];

  const chunks = expo.chunkPushNotifications(messages);
  let sent = false;

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          sent = true;
        } else if (ticket.status === 'error') {
          console.error('[ExpoPush] Ticket error:', ticket.message, ticket.details);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            return false;
          }
        }
      }
    } catch (error) {
      console.error('[ExpoPush] Send failed:', error.message);
    }
  }

  return sent;
}

module.exports = { sendToToken, Expo };
