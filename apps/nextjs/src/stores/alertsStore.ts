import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { app } from "~/constants";

export interface AlertsStore {
  dismissedAlertIds: string[];
  dismissAlertId: (id: string) => void;
}

const useAlertsStore = create(
  persist<AlertsStore>(
    (set, _get) => ({
      dismissedAlertIds: [],
      dismissAlertId: (id: string) =>
        set((state) => ({
          dismissedAlertIds: [...state.dismissedAlertIds, id],
        })),
    }),
    {
      name: app.localStorageKeys.alerts,
      storage: createJSONStorage(() => localStorage), // use localStorage instead of sessionStorage
    },
  ),
);

export default useAlertsStore;
