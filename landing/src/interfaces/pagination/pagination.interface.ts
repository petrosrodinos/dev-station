export interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface Paginated<T> {
    data: T[];
    pagination: Pagination;
}
