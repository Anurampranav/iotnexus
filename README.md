# Smart CodeFlurry (IoTNexus)

A premium mobile IoT control, water infrastructure monitoring, and universal device automation platform built with **React Native**, **Expo SDK 57**, and **TypeScript**.

---

## Overview

**Smart CodeFlurry** provides unified management of smart home devices, agricultural sensors, water infrastructure (borewell, sump, overhead tanks), and automation routines. Designed around a **Warm Charcoal Glassmorphism** design language, it combines hardware-level safety rules with a smooth, responsive mobile experience.

---

## Features

- **Universal Automation Engine**:
  - Multi-condition trigger evaluation (`AND` / `OR` logic)
  - Time-of-day, sensor threshold, and device state conditions
  - Action dispatching with configurable delays and parameter payloads
  - Safety-critical rules (e.g. pump dry-run prevention, over-current cutoff) with cooldown protection and run logs
  - In-app **Automation Builder** modal for visual rule creation and editing

- **Water Infrastructure & Pump Management**:
  - Live monitoring of Borewell, Sump, and Overhead Tank water levels
  - Real-time pump control (Borewell Pump, Tank Transfer Pump, Irrigation Pump)
  - Dry-run protection, runtime limits, and overflow prevention rules

- **Device Management**:
  - Real-time telemetry monitoring (temperature, humidity, soil moisture, motion, power usage)
  - Device filtering by category (Sensors, Pumps, Lights, Smart Plugs)
  - Search and instant status toggling

- **Warm Charcoal Glassmorphism Design System**:
  - Dark-mode optimized palette (`#1E1B19`, `#2A2725`, `#FF8A50`)
  - Floating translucent `GlassTabBar`, `GlassCard`, `GlassButton`, and `GlassToggle`
  - Responsive safe-area insets across diverse Android and iOS screen dimensions

- **Profile & App Settings**:
  - State-driven Profile screen integrated with user preferences
  - Dedicated App Settings for notifications, measurement units (°C/°F, Liters/Gallons), automation cooldowns, and biometric security

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [React Native](https://reactnative.dev/) / [Expo SDK 57](https://expo.dev/) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict typing) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **UI & Icons** | `@expo/vector-icons` (Material Community Icons), custom Glass components |
| **Platform Support** | Android (API 36 / 16+), iOS, Expo Go & Custom Dev Builds |

---

## Project Structure

```text
SmartCodeFlurry/
├── app/                        # Expo Router screen routes
│   ├── (tabs)/                 # Bottom tab screens
│   │   ├── index.tsx           # Home Dashboard
│   │   ├── devices.tsx         # Devices Directory & Filter
│   │   ├── automations.tsx     # Automations Management
│   │   ├── water.tsx           # Water Infrastructure & Pumps
│   │   └── more.tsx            # Profile Screen
│   ├── auth/                   # Authentication routes
│   ├── device/[id].tsx         # Device Detail Screen
│   ├── onboarding/             # Onboarding flow
│   ├── settings.tsx            # App Settings (Stack Route)
│   └── _layout.tsx             # Root layout & navigation providers
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── automation/         # Automation Builder & Details modals
│   │   ├── device/             # Device card & telemetry displays
│   │   ├── glass/              # Glassmorphism design primitives
│   │   ├── navigation/         # Custom GlassTabBar
│   │   └── shared/             # Status badges, metric cards, error states
│   ├── data/mock/              # Seed data for devices, rules, and notifications
│   ├── design/                 # Design tokens (Colors, Typography, Spacing)
│   ├── models/                 # TypeScript data contracts & interfaces
│   ├── store/                  # Zustand state stores (app, devices, rules, settings)
│   └── utils/                  # Device helpers and validators
├── assets/                     # Static assets & app icons
└── .agents/                    # Specialized AI agent skills & project rules
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Android Studio](https://developer.android.com/studio) with Android SDK and an emulator (or physical Android/iOS device)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Anurampranav/iotnexus.git
   cd iotnexus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run on Android**:
   - Press `a` in the terminal to launch on a running Android emulator or connected device.
   - Alternatively, run `npx expo run:android` for a native development build.

---

## License

This project is licensed under the MIT License.
