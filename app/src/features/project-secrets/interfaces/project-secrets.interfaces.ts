export interface SecretVariable {
    key: string;
    value: string;
}

export interface SecretSetUpdater {
    id: string;
    email: string;
    full_name: string | null;
}

/** List shape: never carries values. */
export interface SecretSetSummary {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    /** Project-relative env file this set mirrors (e.g. "apps/api/.env"), if any. */
    source_path: string | null;
    variable_count: number;
    created_at: string;
    updated_at: string;
    updated_by: SecretSetUpdater | null;
}

export interface SecretSet extends SecretSetSummary {
    variables: SecretVariable[];
}

export interface SecretSetInput {
    name: string;
    description?: string;
    /** Empty string clears the link. */
    source_path?: string;
    variables: SecretVariable[];
}
