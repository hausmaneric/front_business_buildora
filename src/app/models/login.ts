export interface NxResult<T> {
  nx_result: boolean;
  status: boolean;
  code: number;
  info: boolean;
  warning: boolean;
  error: boolean;
  message: string;
  error_msg: string;
  data: T;
}

export interface TenantLoginPayload {
  accountCode: string;
  email: string;
  password: string;
}

export interface TenantUser {
  id: number;
  name: string;
  email: string;
  role: string;
  role_id?: number;
  company_id?: number;
  permissions?: string[];
}

export interface TenantAccount {
  id: number;
  code: string;
  name: string;
}

export interface TenantLoginData {
  token: string;
  user: TenantUser;
  account?: TenantAccount;
}

export interface StoredSession {
  token: string;
  accountCode: string;
  user: TenantUser;
  account?: TenantAccount;
}
