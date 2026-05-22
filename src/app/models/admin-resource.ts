export interface AdminPagedResponse<T> {
  items: T[];
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    total: number;
    has_next: boolean;
  };
}

export interface BusinessProject {
  id: number;
  company_id: number;
  client_id?: number | null;
  engineer_user_id?: number | null;
  code: string;
  name: string;
  client_name?: string;
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  latitude?: number | null;
  longitude?: number | null;
  budget_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessDiary {
  id: number;
  project_id: number;
  work_date: string;
  weather?: string;
  summary?: string;
  occurrences?: string;
  status?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessActivity {
  id: number;
  daily_log_id: number;
  service_name: string;
  quantity?: number | null;
  unit?: string;
  location?: string;
  notes?: string;
  created_at?: string;
}

export interface BusinessTeam {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessClient {
  id: number;
  company_id: number;
  code?: string;
  name: string;
  document?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessEmployee {
  id: number;
  company_id: number;
  code?: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  role_name?: string;
  notes?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessTeamMember {
  id: number;
  team_id: number;
  user_id?: number | null;
  employee_id?: number | null;
  member_name: string;
  role_name?: string;
  active?: boolean;
  created_at?: string;
}

export interface BusinessMaterial {
  id: number;
  daily_log_id: number;
  material_name: string;
  movement_type?: string;
  quantity?: number | null;
  unit?: string;
  notes?: string;
  created_at?: string;
}

export interface BusinessEquipment {
  id: number;
  daily_log_id: number;
  equipment_name: string;
  status?: string;
  hours_used?: number | null;
  notes?: string;
  created_at?: string;
}

export interface BusinessOccurrence {
  id: number;
  daily_log_id: number;
  occurrence_type?: string;
  title: string;
  description?: string;
  severity?: string;
  resolved?: boolean;
  created_at?: string;
}

export interface BusinessDocument {
  id: number;
  daily_log_id: number;
  file_name: string;
  file_type?: string;
  file_url?: string;
  file_size_bytes?: number | null;
  notes?: string;
  created_at?: string;
}

export interface BusinessUser {
  id: number;
  company_id: number;
  name: string;
  email: string;
  role_id?: number | null;
  phone?: string;
  active?: boolean;
  created_at?: string;
}

export interface TenantMetadataRole {
  id: number;
  name: string;
  code?: string;
}
