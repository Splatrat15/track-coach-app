# Track Coach App - Project Goals & Important Reminders

## 🎯 Project Overview

**Track Coach App** is a comprehensive mobile application designed to **automate and simplify** the track coach's job. The primary goal is **automation** - making the coach's daily tasks easier through automated attendance tracking from an iPad, spreadsheet generation for workouts, OYOs (On Your Own workouts), and other coach-requested features, including possible communication tools.

### Possible App Names
- CoachSync
- Fast Track (Robert's favorite)
- Next Lap
- Pulse
- Stride
- AthleteLog

### Project Management
- **Trello Board**: [Track Application Board](https://trello.com/invite/b/694c451358147377a21498f5/ATTIcc8fbb098b3dd37fa65151da080e42b191C27B62/track-application)

---

## 🎯 Core Goals

### Primary Objective: AUTOMATION

The main goal is **automation** to make the track coach's job easier:

1. **Automated Attendance Tracking**
   - Quick check-in from iPad during practice
   - Real-time attendance status
   - Historical attendance records

2. **Automated Workout Management**
   - Spreadsheet generation for workouts
   - OYO (On Your Own) workout tracking
   - Dynamic workout assignments based on athlete rank

3. **Automated Data Organization**
   - Athlete profiles with key information (name, gender, rank, goals)
   - Organized by rank (rookie, veteran, varsity) and gender
   - Quick access to athlete data

4. **Future Communication Features**
   - Team messaging capabilities
   - Coach-to-athlete communication

### Development Timeline Estimates

- **Core functionality (no backend)**: ~4 weeks with focused effort
- **Adding backend**: +1-2 weeks (possibly more)
- **Android support**: +few weeks
- **Note**: These are cautious estimates - real-world development may vary

### Cost Considerations

**Apple (iOS)**
- $99/year for Apple Developer Program
- Covers: TestFlight, App Store distribution, Notifications, CloudKit

**Google Play (Android)**
- One-time $25 fee
- Covers: Distribution

**Backend Costs (for 100 users)**
- **Firebase**: Initially free, then ~$10/month if storing too much data
- **Supabase**: Free tier under 500MB, then $25/month

---

## 🏗️ Architecture Decisions

### Backend Strategy

#### Option 1: Apple-Only (No Custom Backend)
**Use CloudKit (Apple-managed backend)**
- ✅ No servers to run
- ✅ No auth system to build
- ✅ Uses Apple IDs
- ✅ Works on iPhone & iPad
- ✅ Offline-first
- ✅ Feels like "no backend" but Apple hosts it
- ❌ **Requirement**: Only Apple products supported

**The Core Rule (No Backend Reality Check):**
> If Device A taps "I'm here" and Device B sees it instantly or automatically, some shared storage must exist. There is no way for two devices to magically sync state with only local storage.

**What CloudKit Enables:**
- Real-time sync across Apple devices
- Athlete checking in on phone, coach seeing it on iPad
- Automatic sync without building a backend

#### Option 2: Cross-Platform (Requires Backend)
**If we want to support Android users, we MUST include a backend:**
- Firebase or Supabase required
- Adds complexity and cost
- Enables cross-platform sync

### What is NOT Possible Without Shared Service

❌ **Not possible without any shared service:**
- Two devices updating each other in real time
- One athlete checking in on their phone and coach seeing it on an iPad
- Sync across devices with only on-device storage

✅ **What IS possible without building your own backend:**
- CloudKit (Apple-managed backend) - Best solution for Apple-only apps
- Offline-first local storage with AsyncStorage
- Single-device functionality

---

## 📋 Key Features & Requirements

### Attendance Management
- ✅ Daily attendance tracking with check-in functionality
- ✅ Visual indicators for present athletes (checkmark icons)
- ✅ Individual athlete attendance detail screens
- ✅ Support for multiple attendance statuses (present, absent, tardy, excused)
- ✅ Attendance records persist across app sessions

### Athlete Management
- ✅ Add new athletes with first and last name
- ✅ Remove athletes from the team
- ✅ Store athlete information:
  - First name and last name
  - Gender (male/female)
  - Rank (rookie/veteran/varsity/veteran-varsity)
  - Goal 1600m time (MM:SS format)
- ✅ Sort athletes alphabetically by last name
- ✅ Display athlete count in header

### Workout Management
- ✅ View workouts organized by date
- ✅ Filter workouts by type (workout, longrun, recovery)
- ✅ Spreadsheet view for athlete assignments
- ✅ Filter athletes by rank and gender in workout view
- ✅ Copy workout details to clipboard
- ✅ Support for workout templates with sections:
  - Warmup exercises
  - Main workout exercises (grouped by rank)
  - Post-workout exercises
- ✅ Dynamic exercise assignments based on athlete rank

### Messages (Future Feature)
- ⚠️ Placeholder screen currently implemented
- 📝 Planned: Team communication functionality

---

## 🎨 Design System & Standards

### Color Palette
- **Primary (Navy Blue)**: `#1E3A5F` - Main app color, top bars, headers, primary buttons
- **Secondary (Forest Green)**: `#2F6F4E` - "Present" status, success states
- **Neutral Background (Light Gray)**: `#F4F6F8` - App background, tables & cards
- **Text/Contrast (Charcoal)**: `#1F2933` - Primary text, icons
- **White**: `#FFFFFF` - Card backgrounds, contrast
- **Black**: `#000000` - Deep contrast when needed

### Typography & Spacing
- Use consistent base styles from `constants/styles.ts`
- Support responsive design for tablets (width >= 768px)
- Maintain consistent padding and margins across screens

### Icons
- Use Ionicons from `@expo/vector-icons`
- Maintain consistent icon sizes (20px mobile, 24px tablet for standard icons)

---

## ⚠️ IMPORTANT REMINDERS

### Data Management
- **ALWAYS** initialize data before accessing it:
  - Call `initializeAthletes()` before using athlete data
  - Call `initializeAttendanceRecords()` before accessing attendance records
  - Use `getAllAthletes()` to get the latest athlete list after mutations

- **Date Handling**:
  - Always normalize dates to midnight (00:00:00) when comparing
  - Use `setHours(0, 0, 0, 0)` to avoid timezone issues
  - Store dates as Date objects, not strings

- **AsyncStorage Keys**:
  - `@athletes` - Athlete data
  - `@attendance_records` - Attendance records
  - `@attendance_last_reset_date` - Last reset date tracking

### Code Organization
- **Data Layer**: All data access functions are in `frontend/data/`
  - `athletes.ts` - Athlete and attendance management
  - `workouts.ts` - Workout data
  - `workoutTemplates.ts` - Workout template definitions
  - `types.ts` - Shared TypeScript interfaces
  - `locations.ts` - Location data

- **Component Structure**:
  - Use Expo Router file-based routing
  - Tab screens are in `app/(tabs)/`
  - Shared components in `components/`
  - Constants and styles in `constants/`

### State Management
- Use React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) for local state
- Refresh data when screens come into focus using `useFocusEffect`
- Always update state after data mutations to trigger re-renders

### Performance Considerations
- Use `useMemo` for expensive computations (sorting, filtering)
- Use `useCallback` for event handlers passed to child components
- Implement loading states for async operations
- Use `ScrollView` with proper `keyboardShouldPersistTaps` for forms

### Error Handling
- Always wrap async operations in try-catch blocks
- Show user-friendly error messages using `Alert.alert()`
- Log errors to console for debugging
- Handle edge cases (empty lists, missing data, etc.)

### User Experience
- Provide visual feedback for all actions (loading states, success indicators)
- Use haptic feedback for important actions (if available)
- Ensure keyboard doesn't cover input fields (use `KeyboardAvoidingView`)
- Scroll to relevant content when inputs are focused
- Support both iOS and Android platforms

### Testing & Quality
- Test on both mobile and tablet screen sizes
- Verify data persistence after app restarts
- Test edge cases (empty lists, long names, special characters)
- Ensure proper TypeScript types are used throughout
- Follow existing code patterns and conventions

---

## 🚀 Development Guidelines

### Adding New Features
1. **Check for existing functionality first** - Never duplicate code
2. **Plan the data structure first** - Update `types.ts` if needed
3. **Create data access functions** - Add to appropriate data file (single file per functionality)
4. **Create shared utilities** - If you need a helper function, check if it exists first
5. **Build the UI component** - Follow existing design patterns
6. **Test data persistence** - Ensure data saves and loads correctly
7. **Add error handling** - Handle edge cases gracefully
8. **Test on multiple devices** - Verify responsive design works
9. **Review for code repetition** - Ensure you're not duplicating existing code

### Modifying Existing Features
1. **Check data dependencies** - Understand what data the feature uses
2. **Use database functions** - Never hardcode data that exists in the database
3. **Maintain backward compatibility** - Handle data migrations if needed
4. **Update related components** - Ensure changes don't break other features
5. **Test thoroughly** - Verify all related functionality still works
6. **Refactor if needed** - If you find duplicated code, extract to shared utilities

### Code Style
- Use TypeScript for type safety
- Follow existing naming conventions
- Use descriptive variable and function names
- Add comments for complex logic
- Keep components focused and single-purpose
- **Extract reusable logic into helper functions** - This is mandatory, not optional
- **Always use existing functions** - Check before writing new code
- **Single source of truth** - Database and utility functions are the only sources

### Dependency Management
- **Before installing**: Can we do this ourselves?
- **Check alternatives**: Is there a lighter-weight solution?
- **Review regularly**: Remove unused dependencies
- **Document necessity**: If we install something, document why it's absolutely necessary

---

## 📝 Future Enhancements (Not Yet Implemented)

- [ ] Complete messages/communication feature
- [ ] CloudKit integration for Apple device sync (if staying Apple-only)
- [ ] Backend API integration (Firebase/Supabase) if supporting Android
- [ ] Workout history and analytics
- [ ] Performance tracking and progress charts
- [ ] Export functionality (CSV, PDF)
- [ ] Push notifications for important updates
- [ ] Multi-coach support
- [ ] Athlete photo uploads
- [ ] Custom workout builder UI
- [ ] Integration with timing systems
- [ ] Android support (requires backend implementation)

---

## 🔧 Technical Stack

- **Framework**: React Native with Expo
- **Routing**: Expo Router (file-based routing)
- **Language**: TypeScript
- **Storage**: AsyncStorage (local persistence)
- **Future Sync**: CloudKit (for Apple-only) or Firebase/Supabase (for cross-platform)
- **Icons**: Ionicons
- **State Management**: React Hooks
- **Styling**: React Native StyleSheet

### Current Dependencies (Review Regularly)

**Core (Required)**
- `expo` - Framework
- `expo-router` - Routing
- `react`, `react-native` - Core libraries
- `@react-native-async-storage/async-storage` - Local storage

**UI/UX (Required)**
- `@expo/vector-icons` - Icons
- `react-native-safe-area-context` - Safe area handling
- `react-native-screens` - Screen management

**Utilities (Review if needed)**
- `expo-clipboard` - Copy to clipboard
- `expo-haptics` - Haptic feedback
- `expo-linking` - Deep linking

**Navigation (Required for Expo Router)**
- `@react-navigation/*` - Navigation dependencies

**⚠️ Review all dependencies regularly** - Remove any that aren't absolutely necessary

---

## 🚨 CRITICAL DEVELOPMENT RULES - BARE MINIMUM RESOURCES

### ⚠️ NO CODE REPETITION - SINGLE SOURCE OF TRUTH

**ABSOLUTE REQUIREMENT**: We must use **bare minimum resources** and **CANNOT REPEAT CODE**.

#### Core Principles:

1. **Single File for Each Functionality**
   - Each feature/functionality must have ONE dedicated file
   - All related functions must be in that single file
   - Never duplicate functionality across files

2. **Use Functions to Avoid Repetition**
   - If you need to format a date, use a shared utility function
   - If you need athlete names, use `getAthleteName()` from the database
   - If you need to check if a date is today, use a shared utility
   - **NEVER** repeat logic - always extract to reusable functions

3. **Database is the Single Source of Truth**
   - **NEVER** repeat athlete names if they're in the database
   - **NEVER** hardcode data that should come from the database
   - **ALWAYS** use database functions to access data
   - Example: Use `getAthleteName(athlete)` instead of manually concatenating `firstName` and `lastName`

4. **Only Install Dependencies We ABSOLUTELY Need**
   - Every dependency adds to bundle size and slows the app
   - If we can do it ourselves, we should
   - Only install when absolutely necessary
   - Review dependencies regularly and remove unused ones

5. **Shared Utilities**
   - Date formatting functions → Create `utils/date.ts`
   - Common helper functions → Create `utils/helpers.ts`
   - Never duplicate utility functions across files

### Code Repetition Issues - FIXED ✅

✅ **All Issues Resolved:**
1. ✅ `getDateKey()` function - Now centralized in `frontend/utils/date.ts`
   - Removed duplicates from `workout.tsx`, `locations.ts`, `workoutTemplates.ts`
   - All files now import from shared utility

2. ✅ Date normalization - Created `normalizeDate()` utility function
   - Replaced all `setHours(0, 0, 0, 0)` calls with `normalizeDate()`
   - Updated in: `attendance.tsx`, `attendance/[id].tsx`, `workout.tsx`, `athletes.ts`, `workouts.ts`

3. ✅ Date utility functions - All moved to `frontend/utils/date.ts`
   - `isToday()`, `formatDate()`, `getOrdinalSuffix()` now shared
   - All files import from single source of truth

### Code Review Checklist:

Before committing code, ask:
- [ ] Am I repeating code that exists elsewhere?
- [ ] Can I use an existing function instead?
- [ ] Is this data already in the database?
- [ ] Can I extract this to a shared utility?
- [ ] Do I really need this new dependency?
- [ ] Is this the single source of truth for this functionality?

---

## 📌 Critical Notes

1. **DO NOT** run or stop the server/client manually - this is handled by the user
2. **ALWAYS** test data persistence after making changes to data layer
3. **REMEMBER** to handle date normalization for accurate comparisons
4. **ENSURE** responsive design works on both mobile and tablet
5. **MAINTAIN** consistent error handling patterns
6. **FOLLOW** the existing color scheme and design system
7. **VALIDATE** user input before saving data
8. **UPDATE** state after all data mutations to trigger re-renders
9. **NEVER REPEAT CODE** - Always use existing functions and utilities
10. **ONLY INSTALL DEPENDENCIES** that are absolutely necessary
11. **USE DATABASE FUNCTIONS** - Never hardcode or repeat data that exists in the database

---

## 🎓 Project Philosophy

This app is designed to be:
- **Simple**: Easy to use during practice sessions
- **Fast**: Quick access to key information
- **Reliable**: Data persists and is always available
- **Flexible**: Adapts to different team sizes and workout types
- **Professional**: Clean design that coaches can trust

---

## 🔍 Code Repetition Audit (Current Issues)

### Issues Found During Scan

#### 1. Duplicate `getDateKey()` Function
**Location**: Found in 3 files
- `frontend/app/(tabs)/workout.tsx` (lines 68-76)
- `frontend/data/locations.ts` (lines 7-15)
- `frontend/data/workoutTemplates.ts` (lines 9-16)

**Fix Required**: 
- Create `frontend/utils/date.ts`
- Move `getDateKey()` to shared utility
- Import and use in all 3 files

#### 2. Date Normalization Logic Repeated
**Location**: Multiple files use `setHours(0, 0, 0, 0)`
- `frontend/app/(tabs)/attendance.tsx`
- `frontend/app/(tabs)/attendance/[id].tsx`
- `frontend/app/(tabs)/workout.tsx`
- `frontend/data/athletes.ts`

**Fix Required**:
- Create `normalizeDate(date: Date): Date` in `utils/date.ts`
- Replace all instances with function call

#### 3. Date Utility Functions Not Shared
**Location**: `frontend/app/(tabs)/workout.tsx` only
- `isToday()` (lines 13-19)
- `formatDate()` (lines 33-65)
- `getOrdinalSuffix()` (lines 22-30)

**Fix Required**:
- Move all to `frontend/utils/date.ts`
- Export for use across the app

#### 4. Good Practices Found ✅
- `getAthleteName()` is properly centralized in `data/athletes.ts` and used everywhere
- Database functions are properly organized in `data/` directory
- Types are centralized in `data/types.ts`

### Action Items

- [x] Create `frontend/utils/date.ts` with all date utilities ✅
- [x] Refactor all files to use shared date utilities ✅
- [x] Remove duplicate `getDateKey()` implementations ✅
- [x] Replace inline date normalization with `normalizeDate()` function ✅
- [ ] Review all dependencies in `package.json` for necessity (ongoing)
- [ ] Document any remaining code that might be duplicated (ongoing)

---

*Last Updated: [Current Date]*
*Version: 1.0.0*

