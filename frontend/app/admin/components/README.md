# Admin Dashboard Components

This directory contains the modular components that make up the admin dashboard, replacing the monolithic `admin/page.tsx` file.

## Component Structure

### Core Components

- **`AdminDashboard.tsx`** - Main orchestrator component that manages state and renders child components
- **`Overview.tsx`** - Dashboard overview with stats, quick actions, and recent activity
- **`UserManagement.tsx`** - User CRUD operations, search, filtering, and status management
- **`PaymentManagement.tsx`** - Payment monitoring, status updates, and export functionality
- **`PromoCodeManagement.tsx`** - Promo code creation, editing, and management
- **`Analytics.tsx`** - Charts and statistics for revenue, user growth, and payment methods
- **`Settings.tsx`** - Platform configuration management
- **`Notifications.tsx`** - Bulk notifications, templates, and notification history management

### Supporting Files

- **`types.ts`** - TypeScript interfaces for all data structures
- **`admin.css`** - Admin-specific styles and responsive design
- **`README.md`** - This documentation file

## Component Communication

The `AdminDashboard` component serves as the central state manager and passes data and callback functions down to child components via props. This follows a top-down data flow pattern:

```
AdminDashboard (State + API calls)
├── Overview (analytics, onTabChange)
├── UserManagement (users, CRUD callbacks)
├── PaymentManagement (payments, update callbacks)
├── PromoCodeManagement (promoCodes, CRUD callbacks)
├── Analytics (analytics)
├── Settings (settings, update callbacks)
└── Notifications (standalone with internal state)
```

## State Management

- **Global State**: Users, payments, analytics, promo codes, and settings are managed in `AdminDashboard`
- **Local State**: Each component manages its own UI state (modals, forms, etc.)
- **API Integration**: All data fetching and mutations happen through `AdminDashboard` and are passed down

## Features by Component

### Overview
- Platform statistics dashboard
- Quick action buttons
- Recent activity feed
- Tab navigation shortcuts

### User Management
- User listing with search and filters
- Add/Edit/Delete user modals
- User status management (active/inactive)
- Role-based filtering

### Payment Management
- Payment history with search
- Payment status updates
- Export functionality
- Payment details modal

### Promo Code Management
- Promo code listing
- Create/Edit/Delete promo codes
- Usage tracking
- Validation rules

### Analytics
- Revenue charts (Line chart)
- User growth charts (Bar chart)
- Payment method distribution (Doughnut chart)
- Platform statistics

### Settings
- General platform settings
- Security configurations
- Notification preferences
- Payment gateway settings
- Email configuration
- Course settings

### Notifications
- Bulk notification system
- Notification templates
- Notification history
- Multi-channel support (email, SMS, push, in-app)
- Scheduling capabilities
- Target audience selection

## Styling

All components use Tailwind CSS with custom admin-specific styles in `admin.css`. The design follows a consistent pattern:

- **Cards**: White backgrounds with rounded corners and subtle shadows
- **Colors**: Blue primary, green success, yellow warning, red error
- **Spacing**: Consistent 6-unit spacing system
- **Responsive**: Mobile-first design with responsive grids
- **Animations**: Framer Motion for smooth transitions

## Benefits of Modular Structure

1. **Maintainability**: Each component has a single responsibility
2. **Reusability**: Components can be easily reused or modified
3. **Testing**: Individual components can be tested in isolation
4. **Team Development**: Multiple developers can work on different components
5. **Performance**: Smaller components lead to better code splitting
6. **Debugging**: Issues are easier to isolate and fix

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Filtering**: More sophisticated search and filter options
- **Export Options**: Additional data export formats
- **Bulk Operations**: Mass user/payment operations
- **Audit Logs**: Comprehensive activity tracking
- **Advanced Analytics**: More detailed reporting and insights

## Usage

The admin dashboard is accessed at `/admin` and automatically loads the `AdminDashboard` component, which then renders the appropriate child component based on the active tab.

The new modular structure addresses all these issues while maintaining the same functionality and improving the user experience.
