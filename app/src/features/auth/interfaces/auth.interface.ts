export interface SignInUser {
    email: string;
    password: string;
}

export interface SignUpUser {
    email: string;
    password: string;
    full_name?: string;
}

export interface AuthResponse {
    access_token: string;
    expires_in: number;
    user: {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        role: string;
    };
}
