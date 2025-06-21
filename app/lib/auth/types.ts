export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    given_name?: string;
    [key: string]: string | undefined;
  };
  app_metadata?: {
    [key: string]: unknown;
  };
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AuthUser | null;
  session: AuthSession | null;
  error: string | null;
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  user_id: string;
  user_email: string;
  expires_at?: number;
}
