import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  phone: string;
  role: string;
  city: string;
}

interface DisasterEvent {
  _id: string;
  type: string;
  severity: string;
  city: string;
  status: string;
  declaredAt: string;
  instructions?: string;
}

interface SOSItem {
  _id: string;
  sosId: string;
  type: string;
  priority: string;
  status: string;
  latitude: number;
  longitude: number;
  description?: string;
  userId?: { name: string; disasterId: string };
  createdAt: string;
}

interface LocationPin {
  userId: string;
  latitude: number;
  longitude: number;
  status: string;
  name?: string;
  disasterId?: string;
  timestamp: number;
}

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalSOS: number;
  resolvedSOS: number;
  volunteers: number;
  missing: number;
}

interface AdminStore {
  // Auth
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;

  // Event
  activeEvent: DisasterEvent | null;
  setActiveEvent: (e: DisasterEvent | null) => void;

  // SOS
  sosQueue: SOSItem[];
  setSosQueue: (q: SOSItem[]) => void;
  updateSOSItem: (id: string, update: Partial<SOSItem>) => void;

  // Locations
  locationPins: Record<string, LocationPin>;
  upsertPin: (pin: LocationPin) => void;

  // Analytics
  analytics: Analytics | null;
  setAnalytics: (a: Analytics) => void;

  // UI
  selectedCity: string;
  setSelectedCity: (c: string) => void;
  sidebarTab: string;
  setSidebarTab: (t: string) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),

  activeEvent: null,
  setActiveEvent: (e) => set({ activeEvent: e }),

  sosQueue: [],
  setSosQueue: (q) => set({ sosQueue: q }),
  updateSOSItem: (id, update) =>
    set((s) => ({
      sosQueue: s.sosQueue.map((item) =>
        item._id === id ? { ...item, ...update } : item
      ),
    })),

  locationPins: {},
  upsertPin: (pin) =>
    set((s) => ({
      locationPins: {
        ...s.locationPins,
        [pin.userId]: {
          ...(s.locationPins[pin.userId] || {}),
          ...pin,
        },
      },
    })),

  analytics: null,
  setAnalytics: (a) => set({ analytics: a }),

  selectedCity: '',
  setSelectedCity: (c) => set({ selectedCity: c }),

  sidebarTab: 'map',
  setSidebarTab: (t) => set({ sidebarTab: t }),
}));
