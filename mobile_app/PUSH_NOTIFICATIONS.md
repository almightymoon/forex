# Push notifications (signal alerts when the app is closed)

WhatsApp-style delivery uses **Expo Push → FCM (Android) / APNs (iOS)**.  
Remote push does **not** work in Expo Go — use an EAS development or production build.

## Prerequisites (EAS credentials)

Run from `mobile_app/`:

```bash
npx eas credentials
```

Confirm:

| Platform | Required |
|----------|----------|
| Android | FCM V1 service account (or Google Services) linked to project `6a3902ef-0f67-4a9f-b79b-3f6048acc816` |
| iOS | APNs key for bundle `com.fxnavigators.app` |

Expo dashboard: https://expo.dev → project **the-fx-navigators** → Credentials.

## Build & install

```bash
# Preview APK (Android) or internal iOS build
npx eas build --profile preview --platform android
# or
npx eas build --profile preview --platform ios
```

Install that build on a physical device (not Expo Go, not only a simulator without push).

## Device checklist

1. Open the app once while logged in as a **student** (creates Android `Trading Signals` channel + registers Expo token).
2. Settings → Push Notifications **on**. If you see “Notifications are off”, tap retry and allow system permission.
3. Force-quit the app (swipe away from recents).
4. Teacher publishes a trading signal from the web/admin.
5. Within a few seconds you should get a system banner with title like `New BUY signal`.
6. Tap → opens Signals screen.

## Backend audience

Push goes to users where:

- `role: 'student'`
- `isActive !== false`
- `preferences.pushNotifications !== false`
- `preferences.expoPushToken` is a non-empty Expo token

Stale tokens (`DeviceNotRegistered`) are cleared automatically after Expo receipt polling so the next app open can re-register.

## Common failures

| Symptom | Cause |
|---------|--------|
| No banner in Expo Go | Expected — use EAS build |
| Ticket OK, no Android banner | `signals` channel missing — open new build once |
| Never receives | No FCM/APNs credentials in EAS |
| Works then stops | Stale token — open app to re-register (auto-cleared on receipt error) |
| Permission denied | Enable in phone Settings → Apps → The FX Navigators → Notifications |
