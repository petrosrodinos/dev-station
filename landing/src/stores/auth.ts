import type { LoggedInUser } from "@/features/user/interfaces/user.interface";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthStore extends LoggedInUser {
    hydrated: boolean;
    login(user: LoggedInUser): void;
    logout(): void;
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

const STORE_KEY = "admin-auth";

// SSR-safe: Next.js renders "use client" components on the server too, where `localStorage`
// doesn't exist. The admin console only ever runs in the browser, so a no-op storage there is fine.
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            ...initialValues,
            hydrated: false,
            login: (user) => set((state) => ({ ...state, ...user, isLoggedIn: true })),
            logout: () => set((state) => ({ ...state, ...initialValues })),
            setHydrated: () => set({ hydrated: true }),
        }),
        {
            name: STORE_KEY,
            storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage)),
            // Functions aren't JSON-serializable and are dropped automatically — no need to hand-pick fields.
            partialize: (state) => ({ ...state, hydrated: undefined }),
            // Mark hydrated even when reading storage fails, so the app falls through to the login form instead of hanging.
            onRehydrateStorage: () => () => useAuthStore.setState({ hydrated: true }),
        },
    ),
);

export const getAuthStoreState = () => useAuthStore.getState();
