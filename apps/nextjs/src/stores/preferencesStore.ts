import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { app } from "~/constants";

export interface PreferencesState {
  isDemoAlertOpen: boolean;
  setIsDemoAlertOpen: (newState: boolean) => void;
}

const usePreferences = create(
  persist<PreferencesState>(
    (set, _get) => ({
      isDemoAlertOpen: true,
      setIsDemoAlertOpen: (newState: boolean) => set({ isDemoAlertOpen: newState }),
    }),
    {
      name: app.localStorageKeys.preferences,
      storage: createJSONStorage(() => sessionStorage), // alternatively use: localStorage
    }
  )
)

export default usePreferences;