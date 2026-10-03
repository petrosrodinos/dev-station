import { useId } from "react";

/** The Dev Station mark (same artwork as the app's favicon.svg), inlined so it scales crisply at any size. */
export function AppLogo() {
    const gradientId = useId();
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ff5757" />
                    <stop offset="1" stopColor="#a1131a" />
                </linearGradient>
            </defs>
            <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#101111" stroke="#2a2d2f" />
            <rect x="6.5" y="6.5" width="9" height="9" rx="2" fill={`url(#${gradientId})`} />
            <rect x="16.5" y="6.5" width="9" height="9" rx="2" fill="#3a3d3f" />
            <rect x="6.5" y="16.5" width="9" height="9" rx="2" fill="#3a3d3f" />
            <rect x="16.5" y="16.5" width="9" height="9" rx="2" fill="#3a3d3f" />
        </svg>
    );
}
