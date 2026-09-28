export interface AgentSessionConfig {
  system_prompt?: string;
  greeting?: string;
  voice?: {
    voice_id?: string;
  };
  output?: {
    type?: "audio" | "text" | "audio_and_text";
  };
  tools?: any[];
}

export interface WSMessage {
  type: string;
  [key: string]: any;
}
