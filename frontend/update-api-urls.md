# API URL Update Guide

## Environment Variable Setup ✅
- Added `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` to `.env.local`
- Created `utils/api.ts` with helper functions

## Files Updated ✅
- `app/teacher/components/Communication.tsx` - All API calls updated
- `app/login/page.tsx` - Login and 2FA API calls updated
- `app/register/page.tsx` - Registration and promo validation API calls updated
- `app/dashboard/page.tsx` - Main API calls updated

## Files Still Need Updating
The following files still have hardcoded `http://localhost:4000` URLs that need to be updated:

### High Priority Files:
1. `app/notifications/page.tsx` - Notification management
2. `app/settings/page.tsx` - User settings and 2FA
3. `app/profile/page.tsx` - User profile management
4. `app/teacher/page.tsx` - Teacher dashboard data fetching
5. `app/components/TwoFactorModal.tsx` - 2FA setup
6. `app/components/ChangePasswordModal.tsx` - Password changes

### Teacher Components:
7. `app/teacher/components/TradingSignals.tsx`
8. `app/teacher/components/Students.tsx`
9. `app/teacher/components/LiveSessions.tsx`
10. `app/teacher/components/Analytics.tsx`
11. `app/teacher/components/Assignments.tsx`
12. `app/teacher/components/Courses.tsx`

### Dashboard Components:
13. `app/dashboard/components/StudentAssignments.tsx`
14. `app/dashboard/components/NotificationDropdown.tsx`

### Admin Components:
15. `app/admin/components/AdminDashboard.tsx`

### Other Files:
16. `app/course/[id]/page.tsx`
17. `context/SettingsContext.tsx`

## How to Update Each File:

1. **Add the import:**
   ```typescript
   import { buildApiUrl } from '@/utils/api';
   ```

2. **Replace hardcoded URLs:**
   ```typescript
   // Before:
   fetch('http://localhost:4000/api/endpoint')
   
   // After:
   fetch(buildApiUrl('api/endpoint'))
   ```

3. **For URLs with parameters:**
   ```typescript
   // Before:
   fetch(`http://localhost:4000/api/endpoint/${id}`)
   
   // After:
   fetch(buildApiUrl(`api/endpoint/${id}`))
   ```

## Benefits:
- ✅ Easy to change API base URL from environment file
- ✅ Consistent API URL handling across the app
- ✅ Better for different environments (dev, staging, production)
- ✅ No more hardcoded URLs

## To Change the Base URL:
Simply update the `NEXT_PUBLIC_API_BASE_URL` in your `.env.local` file:
```
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```
