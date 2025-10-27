export interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserProfileParams {
  id: string;
  username: string;
  display_name?: string;
}
