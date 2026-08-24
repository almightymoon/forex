# The FX Navigators — Mobile App

React Native (Expo) app with splash, login, and sign-up screens matching the FX Navigators design.

## Screens

- **Splash** — FN logo on animated trading background, auto-navigates to auth
- **Login** — Email, password, remember me, forgot password
- **Sign Up** — First/last name, email, date of birth, phone, password, referral code

## Getting started

```bash
cd mobile_app
npm install
npm start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go.

## Project structure

```
mobile_app/
├── app/              # Expo Router screens
├── assets/images/    # Logo and background images
├── components/       # Reusable UI components
└── constants/        # Theme colors and typography
```

## Notes

- Remote push (signal alerts when the app is closed) requires an **EAS build**, not Expo Go. See [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md).
- Auth and API calls use the shared backend at `thefxnavigators.com`.
