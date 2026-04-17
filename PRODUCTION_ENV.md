# Environment Configuration for Production Security

## Backend (.env)

Add this to your backend `.env` file:

```bash
# Environment
NODE_ENV=production

# Disable Morgan logging in production (optional)
MORGAN_ENABLED=false

# Your existing variables...
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
# ... etc
```

## Frontend (.env.local or .env.production)

```bash
# Environment
NODE_ENV=production

# Your existing variables...
NEXT_PUBLIC_API_URL=https://your-api-domain.com
# ... etc
```

## Deployment Platforms

### Vercel / Netlify
Set in dashboard:
- `NODE_ENV` = `production`

### AWS / DigitalOcean / VPS
In your start script or systemd service:
```bash
NODE_ENV=production npm start
```

### Docker
In your Dockerfile:
```dockerfile
ENV NODE_ENV=production
```

## Build Commands

### Frontend (Next.js)
```bash
# Development
npm run dev

# Production build
NODE_ENV=production npm run build
NODE_ENV=production npm run start
```

### Backend (Node.js)
```bash
# Development
npm run dev

# Production
NODE_ENV=production npm start
```

## Verify Protection is Active

1. **Console Logs Removed**:
   - Open browser console on production site
   - Should see no `console.log` outputs
   - Should still see `console.error` and `console.warn`

2. **DevTools Protection Active**:
   - Right-click should be disabled
   - F12 and keyboard shortcuts should not work
   - Warning should appear if DevTools is opened

3. **Source Maps Hidden**:
   - Check Network tab (if accessible)
   - Should not see `.map` files being loaded
   - JavaScript should be minified

## Troubleshooting

### Console logs still showing?
- Check `NODE_ENV` is set to `production`
- Run `npm run build` again
- Clear browser cache

### DevTools protection not working?
- Ensure `NODE_ENV=production`
- Check browser console for errors in `DevToolsProtection` component
- Some browsers may bypass client-side protection

### Performance issues?
- Ensure compression is enabled in `next.config.js`
- Check that `swcMinify: true` is set
- Verify `compress: true` in backend helmet config
