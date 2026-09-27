import type { LoggedInUser } from "@/features/user/interfaces/user.interface";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { secureStateStorage } from "@/lib/secure-storage";

interface AuthStore extends LoggedInUser {
    hydrated: boolean;
    login(user: LoggedInUser): void;
    logout(): void;
    updateUser(user: Partial<LoggedInUser>): void;
    setHydrated(): void;
}

const initialValues: LoggedInUser = {
    isLoggedIn: false,
    user_uuid: null,
    role: null,
    full_name: "",
    email: null,
    access_token: null,
    expires_in: null,
    avatar: null,
};

const STORE_KEY = "auth";

export const useAuthStore = create<AuthStore>()(
    devtools(
        persist(
            (set) => ({
                ...initialValues,
                hydrated: false,
                login: (user) => set((state) => ({ ...state, ...user, isLoggedIn: true })),
                logout: () => set((state) => ({ ...state, ...initialValues })),
                updateUser: (user) => set((state) => ({ ...state, ...user })),
                setHydrated: () => set({ hydrated: true }),
            }),
            {
                name: STORE_KEY,
                // Session token lives in the OS keychain via Electron safeStorage (localStorage in the browser).
                storage: createJSONStorage(() => secureStateStorage),
                partialize: ({ hydrated: _h, login: _l, logout: _o, updateUser: _u, setHydrated: _s, ...rest }) => rest,
                onRehydrateStorage: () => (state) => state?.setHydrated(),
            },
        ),
    ),
);

export const getAuthStoreState = () => useAuthStore.getState();
