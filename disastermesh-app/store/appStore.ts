import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  phone: string;
  disasterId: string;
  role: string;
  city: string;
  language: string;
  medicalProfile?: {
    bloodGroup?: string;
    allergies?: string[];
    conditions?: string[];
  };
}

interface DisasterEvent {
  _id: string;
  type: string;
  severity: string;
  city: string;
  status: string;
  declaredAt: string;
  instructions?: string;
  description?: string;
}

interface Alert {
  _id: string;
  title: string;
  message: string;
  severity: string;
  type: string;
  sentAt: string;
  read?: boolean;
}

interface AppStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (u: User | null) => void;
  setAuthenticated: (v: boolean) => void;

  // Disaster
  activeEvent: DisasterEvent | null;
  setActiveEvent: (e: DisasterEvent | null) => void;

  // Alerts
  alerts: Alert[];
  unreadCount: number;
  addAlert: (a: Alert) => void;
  setAlerts: (alerts: Alert[]) => void;
  markAlertRead: (id: string) => void;

  // Location
  lastLatitude: number | null;
  lastLongitude: number | null;
  locationStatus: string;
  setLocation: (lat: number, lng: number) => void;
  setLocationStatus: (s: string) => void;

  // Seismic
  seismicAlert: { secondsUntilWave: number; epicenterLat: number; epicenterLng: number } | null;
  setSeismicAlert: (a: AppStore['seismicAlert']) => void;
  clearSeismicAlert: () => void;

  // Network
  isOnline: boolean;
  setOnline: (v: boolean) => void;

  // Family
  familyGroupId: string | null;
  setFamilyGroupId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (u) => set({ user: u }),
  setAuthenticated: (v) => set({ isAuthenticated: v }),

  activeEvent: null,
  setActiveEvent: (e) => set({ activeEvent: e }),

  alerts: [],
  unreadCount: 0,
  addAlert: (a) =>
    set((s) => ({
      alerts: [a, ...s.alerts],
      unreadCount: s.unreadCount + 1,
    })),
  setAlerts: (alerts) =>
    set({ alerts, unreadCount: alerts.filter((a: Alert) => !a.read).length }),
  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a._id === id ? { ...a, read: true } : a)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),

  lastLatitude: null,
  lastLongitude: null,
  locationStatus: 'safe',
  setLocation: (lat, lng) => set({ lastLatitude: lat, lastLongitude: lng }),
  setLocationStatus: (s) => set({ locationStatus: s }),

  seismicAlert: null,
  setSeismicAlert: (a) => set({ seismicAlert: a }),
  clearSeismicAlert: () => set({ seismicAlert: null }),

  isOnline: true,
  setOnline: (v) => set({ isOnline: v }),

  familyGroupId: null,
  setFamilyGroupId: (id) => set({ familyGroupId: id }),
}));
