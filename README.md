![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

# Lumen Finance

A full-stack personal finance management mobile application built with React Native and Expo. Lumen helps users track expenses, manage budgets, visualize spending trends, set savings goals, automate recurring transactions, and receive AI-powered financial insights.

## Project Members

- Prabjot Singh
- Vraj Patel
- Kabir Marwaha

## Version

- Current Version: 1.0.0
- Build Date: May 2026
- Minimum iOS: 14.0
- Minimum Android: 10.0 (API 29)

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React Native, Expo |
| Navigation | Expo Router (file-based routing) |
| Styling | StyleSheet + custom components |
| Backend | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (JWT, bcrypt) |
| Security | Row Level Security (RLS) |
| AI Provider | Groq API (Llama 3.3 70B) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Icons | Ionicons (@expo/vector-icons) |
| Date Picker | @react-native-community/datetimepicker |
| Version Control | Git / GitHub |

## Features

| Feature | Description |
|---------|-------------|
| Authentication | Email/password registration, login, email verification, JWT sessions |
| Dashboard | Net worth, monthly income, expenses, savings rate, budget progress |
| Transactions | Add, edit, delete transactions with category and date selection |
| Budget Tracking | Set monthly limits, visual progress bar, over-budget warnings |
| Analytics | Bar charts comparing income vs expenses (Week, Month, 6 Month, Year) |
| Savings Goals | Create goals, track progress, make contributions |
| Recurring Transactions | Weekly/biweekly/monthly automated entries |
| AI Insights | Personalized financial insights via Groq Llama 3.3 70B |
| Admin Panel | User management, role changes, category management |
| Profile | Personal information, AI insights toggle |

## User Navigation & Capabilities

### Authentication Flow (Unauthenticated Users)

Users who are not logged in are restricted to three screens:

- **Login Screen** - Existing users enter their email and password to access the application. Password field is masked for security.
- **Signup Screen** - New users create an account by providing full name, phone number, email, and password. All fields are validated before submission.
- **Verify Email Screen** - After signup, users are directed to verify their email address via a confirmation link before gaining full access.

### Main Application (Authenticated Users)

Once logged in and email verified, users access the bottom tab navigation with five main sections:

**Home Screen (Dashboard)**
- View total net worth with monthly change indicator
- See monthly income, expenses, and savings summary cards
- Track budget progress with color-coded visual bar 
- View recent transactions with category icons, dates (Today/Yesterday formatting), and badges for recurring items or budget exclusions
- Tap any transaction to edit or delete
- Tap floating action button to add new transactions, recurring items, or goals

**Analytics Screen**
- View bar charts comparing income (purple) vs expenses (grey)
- Toggle between Week, Month, 6 Month, and Year views using period tabs
- Tap individual bars to see exact income or expense amounts via tooltip
- See net value displayed below each bar (green for positive, red for negative)
- View spending breakdown by category with percentage and color-coded progress bars

**Goals Screen**
- Create savings goals with name, target amount, saved amount, deadline, and goal type (Emergency, Travel, Investing, Home, Car, Education, Other)
- Track progress with visual progress bar
- Add contributions to existing goals
- Edit or delete existing goals
- View active goals sorted by progress

**Recurring Screen**
- Create recurring income or expense entries with weekly, biweekly, or monthly frequency
- Set start date and amount
- View estimated monthly totals for recurring income and expenses
- Edit or delete existing recurring items
- System automatically generates transaction entries when due dates are reached

**Insights Screen**
- View side-by-side comparison of current month vs previous month (income, expenses, savings, savings rate)
- Generate AI-powered personalized financial insight by pulling down to refresh
- Insight analyzes spending patterns and provides actionable recommendations
- AI insights can be toggled on/off in Profile settings

### User Profile Screen

- View account information (name, email, phone)
- Edit personal information (name, phone number)
- Toggle AI Insights feature on or off
- Log out of the application

### Admin Panel (Administrator Only)

Users with admin role see an additional Admin entry point and can:

- **User Management Tab**
  - View all registered users sorted by newest first
  - Search users by name or email
  - Tap any user to view details (transaction count)
  - Change user roles between standard user and administrator
- **Category Management Tab**
  - View all transaction categories with usage counts
  - Add new categories
  - Edit existing category names
  - Delete categories (with confirmation)

## Setup Instructions

### Prerequisites

- Node.js (v20.x or higher)
- npm (v8.x or higher)
- Git
- Expo Go app on iOS or Android device (for testing)

### Installation

1. Clone the repository

```bash
git clone <https://github.com/Prabjot-S/LumenFinance>
cd LumenFinance
```
2. Install dependencies

```bash
npm install
```

3. Configure environment variables
Create a .env file in the project root with the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |


4. Start the development server

run this command in the terminal
npx expo start --clear

5. Run the application

Scan the QR code with Expo Go on your mobile device
Press a for Android emulator
Press i for iOS simulator (Mac only)

## Quick Start (One Line Setup)

```bash
git clone https://github.com/Prabjot-S/LumenFinance && cd LumenFinance && npm install && npx expo start --clear
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App won't start | Run `npx expo start --clear` |
| Authentication errors | Verify .env variables are correct |
| AI Insights not working | Check Groq API key in Supabase secrets |
| Build fails | Delete node_modules and run `npm install` again |


## Database Schema
Lumen uses Supabase PostgreSQL with Row Level Security (RLS). The main tables include:

UserInfo - User profiles (full name, email, phone, role)
accounts - Financial data (net worth, monthly income, budget)
transactions - Income and expense entries
categories - Transaction categories (Food, Rent, Transport, etc.)
goals - Savings goals with target amounts and progress
recurring_transactions - Scheduled recurring entries
RLS policies ensure users can only access their own data. Administrators have additional privileges for user and category management.


## Application Structure

```bash
LumenFinance/
├── app/
│   ├── (tabs)/                 # Tab navigation (Home, Analytics, Goals, Recurring, Insights)
│   ├── _layout.tsx             # Root navigation + authentication guard
│   ├── login.js                # Authentication screen
│   ├── signup.js               # Registration screen
│   ├── verify-email.js         # Email verification
│   ├── welcome.js              # Initial financial setup
│   ├── admin.js                # Admin panel
│   └── profile.js              # User profile settings
├── lib/
│   └── supabase.js             # Supabase client configuration
├── supabase/functions/lumen-ai/
│   └── index.ts                # Edge Function for AI insights
└── assets/images/              # Application assets
```

## AI Insights
The AI Insights feature is powered by Groq's Llama 3.3 70B model. When a user requests an insight:
1. The app fetches current and previous month transaction data
2. Aggregated metrics (income, expenses, savings rate) are sent to a Supabase Edge Function
3. The Edge Function securely calls the Groq API with a structured prompt
4. The generated insight is returned and displayed to the user
The Groq API key is stored as a Supabase secret and never exposed to the client.

## Application UI

### Authentication Screens

<table>
  <tr>
    <td align="center"><strong>Login Screen</strong></td>
    <td align="center"><strong>Signup Screen</strong></td>
  </tr>
  <tr>
    <td><img width="236" height="512" alt="Login Screen" src="https://github.com/user-attachments/assets/6f1fd766-fb55-4c4c-9a9e-298ba7cffa86" /></td>
    <td><img width="236" height="512" alt="Signup Screen" src="https://github.com/user-attachments/assets/9910c08c-380a-40a5-b717-ca67a3b1cf52" /></td>
  </tr>
</table>

<br/>

### Main Application Screens

<table>
  <tr>
    <td align="center"><strong>Home Dashboard</strong></td>
    <td align="center"><strong>User Profile</strong></td>
  </tr>
  <tr>
    <td><img width="236" height="512" alt="Home Dashboard" src="https://github.com/user-attachments/assets/bdffb62d-b2cf-41d6-b3ca-4af786f53ca7" /></td>
    <td><img width="236" height="512" alt="User Profile" src="https://github.com/user-attachments/assets/7db2d4c4-097b-401b-adeb-b1d882e43e35" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Analytics Page</strong></td>
    <td align="center"><strong>Goals Page</strong></td>
  </tr>
  <tr>
    <td><img width="236" height="512" alt="Analytics Page" src="https://github.com/user-attachments/assets/f80c5cb1-0b32-4b31-943b-cea10a309f8e" /></td>
    <td><img width="236" height="512" alt="Goals Page" src="https://github.com/user-attachments/assets/dfb2d308-f783-4155-8bbe-142966199811" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Recurring Page</strong></td>
    <td align="center"><strong>AI Insights Page</strong></td>
  </tr>
  <tr>
    <td><img width="236" height="512" alt="Recurring Page" src="https://github.com/user-attachments/assets/4136ce81-c7a6-419e-ad46-37b7040133e0" /></td>
    <td><img width="236" height="512" alt="AI Insights Page" src="https://github.com/user-attachments/assets/a988ba69-67c5-4757-ac5b-0b06fc4eb87d" /></td>
  </tr>
</table>

<br/>

### Admin Panel Screens

<table>
  <tr>
    <td align="center"><strong>Admin Main Page</strong></td>
    <td align="center"><strong>Admin User Management</strong></td>
  </tr>
  <tr>
    <td><img width="236" height="512" alt="Admin Main Page" src="https://github.com/user-attachments/assets/c5afbcd1-aff7-4420-92a4-741a7a096a88" /></td>
    <td><img width="236" height="512" alt="Admin User Management" src="https://github.com/user-attachments/assets/8cc64fd2-8a21-476e-b74a-2887fa230d33" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Admin Category Page</strong></td>
    <td></td>
  </tr>
  <tr>
    <td><img width="236" height="512" alt="Admin Category Page" src="https://github.com/user-attachments/assets/fe789a0b-7738-4afe-9804-e52f9d3c5874" /></td>
    <td></td>
  </tr>
</table>


## License

Private repository - all rights reserved. For educational purposes only.
