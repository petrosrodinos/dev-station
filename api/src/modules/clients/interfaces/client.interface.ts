export interface ClientView {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  project_count: number;
  created_at: Date;
}
