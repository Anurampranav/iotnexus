import { create } from 'zustand';

interface AppStore {
  isOnboardingComplete: boolean;
  isAuthenticated: boolean;
  // Profile data
  userName: string;
  userEmail: string;
  userHomeName: string;
  homeId: string;

  completeOnboarding: () => void;
  setAuthenticated: (val: boolean) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  setUserHomeName: (name: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isOnboardingComplete: false,
  isAuthenticated: false,
  // Mock profile — replace with real auth/backend data in Phase 6
  userName: 'Nicole',
  userEmail: 'nicole@smartcodeflurry.app',
  userHomeName: 'My Home',
  homeId: 'home-001',

  completeOnboarding: () => set({ isOnboardingComplete: true }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setUserName: (name) => set({ userName: name }),
  setUserEmail: (email) => set({ userEmail: email }),
  setUserHomeName: (name) => set({ userHomeName: name }),
}));

