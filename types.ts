// Enums and Interfaces

export enum GameGenre {
  CULTIVATION = "Tu Tiên",
  FANTASY = "Huyền Huyễn",
  SCIFI = "Khoa Huyễn",
  HORROR = "Linh Dị",
  DETECTIVE = "Trinh Thám",
  SLICE_OF_LIFE = "Đời Thường",
  HISTORICAL = "Cổ Trang",
  POST_APOCALYPTIC = "Mạt Thế",
}

export type StoryLength = 'short' | 'medium' | 'long';

export interface GameOption {
  label: string;
  action: string; // The prompt sent to AI if chosen
  type: 'safe' | 'risky' | 'social' | 'custom';
}

export interface GameStats {
  name: string;
  realm: string; // Cảnh giới / Cấp độ
  status: string; // Trạng thái cơ thể
  inventory: string[]; // Hành trang
  // New fields for display in UI
  spiritualRoot?: string; // Acts as Core Attribute / Origin
  talents?: string[]; // Acts as Perks / Skills
}

// The structured response expected from Gemini
export interface AIResponseSchema {
  narrative: string;
  stats: GameStats;
  options: GameOption[];
  isGameOver: boolean;
}

// Custom World Settings
export interface WorldSettings {
  worldContext: string; // Bối cảnh thế giới
  plotDirection: string; // Hướng đi cốt truyện
  majorFactions: string; // Các thế lực lớn
  keyNpcs: string; // NPC quan trọng
}

export interface CharacterTraits {
  spiritualRoot: string; // Generic container for "Root/Class/Origin"
  talents: string[]; // Generic container for "Talents/Perks/Skills"
}

// Database Entities
export interface GameSession {
  id?: number;
  heroName: string;
  gender: string;
  genre: GameGenre;
  worldSettings: WorldSettings;
  characterTraits?: CharacterTraits; // Added traits
  avatarUrl?: string; // User uploaded avatar
  createdAt: number;
}

export interface Turn {
  id?: number;
  sessionId: number;
  turnIndex: number;
  role: 'user' | 'model';
  
  // Content
  userPrompt?: string; // What the user typed/clicked
  narrative?: string; // The story text
  
  // Model Metadata for Restoration & RAG
  rawResponseJSON?: string; // Full JSON response string
  embedding?: number[]; // Vector of the narrative for RAG
  
  // Context for Gemini 3
  thoughtSignature?: string; // Critical for Gemini 3 continuity
}

export interface RagContext {
  text: string;
  relevance: number;
}