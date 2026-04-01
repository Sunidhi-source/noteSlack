export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  users?: User;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  edited_at: string | null;
  created_at: string;
  users?: Pick<User, "full_name" | "avatar_url">;
  parent_message_id?: string | null;
}

export interface Document {
  id: string;
  workspace_id: string;
  title: string;
  content: Record<string, unknown> | null;
  created_by: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresenceUser {
  user_id: string;
  name: string | null;
  avatar: string | null;
  cursor: { x: number; y: number };
  color: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface TypingUser {
  user_id: string;
  name: string | null;
  channel_id: string;
}
