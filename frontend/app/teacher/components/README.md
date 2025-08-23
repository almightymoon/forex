# Teacher Dashboard Components

The teacher dashboard has been broken down into smaller, manageable components for better maintainability and reusability.

## 📁 Component Structure

```
app/teacher/
├── components/
│   ├── Header.tsx              # Dashboard header with title and user actions
│   ├── Navigation.tsx          # Tab navigation component
│   ├── Overview.tsx            # Dashboard overview tab with stats and recent activity
│   ├── Courses.tsx             # Courses management tab
│   ├── CourseCard.tsx          # Individual course display card
│   ├── LoadingSpinner.tsx      # Loading state component
│   └── README.md               # This documentation
├── utils/
│   └── helpers.ts              # Utility functions and helpers
├── types.ts                    # TypeScript interfaces and types
└── page.tsx                    # Main dashboard component (orchestrator)
```

## 🧩 Components Overview

### **Header.tsx**
- Displays dashboard title and subtitle
- Shows notification bell and settings icons
- User profile avatar

### **Navigation.tsx**
- Tab navigation between different dashboard sections
- Handles tab switching with active state styling
- Icons for each tab section

### **Overview.tsx**
- Dashboard statistics cards (students, courses, revenue, ratings)
- Recent student enrollments
- Upcoming live sessions
- Refresh functionality

### **Courses.tsx**
- Course management interface
- Search and filter functionality
- Course grid with loading states
- Empty state handling

### **CourseCard.tsx**
- Individual course display
- Course status, rating, and progress
- Action buttons (edit, view, delete)
- Progress bar visualization

### **LoadingSpinner.tsx**
- Reusable loading component
- Customizable loading message
- Consistent loading UI across components

## 🔧 Utility Functions

### **helpers.ts**
- `getStatusColor()` - Returns CSS classes for course status colors
- `getSessionStatusColor()` - Returns CSS classes for session status colors
- `calculateAnalytics()` - Calculates dashboard analytics from raw data

## 📊 Data Flow

1. **Main Page** (`page.tsx`) fetches data from APIs
2. **State Management** handles data and loading states
3. **Components** receive data as props and render UI
4. **Utility Functions** process and format data for display

## 🚀 Benefits of This Structure

- ✅ **Maintainable**: Each component has a single responsibility
- ✅ **Reusable**: Components can be used in other parts of the app
- ✅ **Testable**: Individual components can be tested in isolation
- ✅ **Scalable**: Easy to add new features and components
- ✅ **Readable**: Clear separation of concerns
- ✅ **Type Safe**: Full TypeScript support with proper interfaces

## 🔄 Adding New Components

To add a new component:

1. Create the component file in `components/` directory
2. Define the component interface with proper TypeScript types
3. Import and use in the main `page.tsx`
4. Add any new types to `types.ts`
5. Add utility functions to `helpers.ts` if needed

## 📝 Usage Example

```tsx
import Header from './components/Header';
import Navigation from './components/Navigation';

export default function TeacherDashboard() {
  return (
    <>
      <Header title="Teacher Dashboard" subtitle="Manage your courses" />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      {/* Other components */}
    </>
  );
}
```

This modular structure makes the teacher dashboard much easier to maintain and extend in the future! 🎉
