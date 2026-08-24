# Push notifications (signal alerts when the app is closed)

WhatsApp-style delivery uses **Expo Push → FCM (Android) / APNs (iOS)**.  
Remote push does **not** work in Expo Go — use an EAS development or production build.

## Android FCM (required — this is what fixes “FirebaseApp is not initialized”)

If Settings shows *Default FirebaseApp is not initialized* / *complete the guide at fcm-credentials*, the APK was built **without** Firebase.

### 1. Create Firebase Android app

1. Open [Firebase Console](https://console.firebase.google.com) → create or select a project.
2. Add an **Android** app with package name exactly: `com.fxnavigators.app`
3. Download **`google-services.json`**
4. Place it at:

```text
mobile_app/google-services.json
```

5. `app.json` already has:

```json
"android": {
  "package": "com.fxnavigators.app",
  "googleServicesFile": "./google-services.json"
}
```

### 2. Upload FCM V1 service account to EAS (server send path)

1. Firebase → Project settings → Service accounts → **Generate new private key**
2. From `mobile_app/`:

```bash
npx eas credentials -p android
```

Choose **Google Service Account** → **FCM V1** → upload that JSON.  
Do **not** commit the private key (only `google-services.json` belongs in the repo).

Guide: https://docs.expo.dev/push-notifications/fcm-credentials/

### 3. Validate before building

```bash
cd mobile_app
node scripts/test-push-classification.cjs
node scripts/validate-push-setup.cjs
```

`validate-push-setup.cjs` must exit **0** before you run `eas build`.

### 4. Build & install a **new** APK

Old builds without `google-services.json` will keep failing. Rebuild after adding the file:

```bash
npx eas build --profile preview --platform android
```

## Prerequisites checklist

| Platform | Required |
|----------|----------|
| Android | `google-services.json` in app + FCM V1 key on EAS |
| iOS | APNs key for bundle `com.fxnavigators.app` |

Expo project: `6a3902ef-0f67-4a9f-b79b-3f6048acc816` (`@moontech94/the-fx-navigators`).

## Device checklist

1. Install the **new** build; log in as a **student**.
2. Settings → Push Notifications **on** (no Firebase error).
3. Force-quit the app.
4. Teacher publishes a signal → system banner within seconds.
5. Tap → Signals screen.

## Backend audience

Push goes to users where:

- `role: 'student'`
- `isActive !== false`
- `preferences.pushNotifications !== false`
- `preferences.expoPushToken` is a non-empty Expo token

Stale tokens (`DeviceNotRegistered`) are cleared after Expo receipt polling.

## Common failures

| Symptom | Cause |
|---------|--------|
| `FirebaseApp is not initialized` | Missing `google-services.json` in this build |
| No banner in Expo Go | Expected — use EAS build |
| Ticket OK, no Android banner | `signals` channel missing — open new build once |
| Never receives | No FCM V1 key on EAS |
| Permission denied | Phone Settings → Apps → Notifications |
