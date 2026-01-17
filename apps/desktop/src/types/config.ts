export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface SpaceConfig {
  cloned_path: string;
  random_name: string;
  branch_name?: string;
  created_at?: number;
  tasks: Task[];
}

export interface AsanaAuth {
  access_token: string;
}

export interface AppConfig {
  groq_api_key?: string;
  spaces: SpaceConfig[];
  asana_auth?: AsanaAuth;
}
