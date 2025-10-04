export interface GameStats {
  Evner: number;
  Udholdenhed: number;
  Held: number;
}

export interface StoryChoice {
  label: string;
  goto: string;
  match?: string[];
}

export interface StoryCheck {
  stat: keyof GameStats;
  dc: number;
  success: string;
  fail: string;
}

export interface StoryNode {
  id: string;
  text: string;
  choices?: StoryChoice[];
  check?: StoryCheck;
}

export interface GameState {
  currentId: string;
  stats: GameStats;
}

export interface SaveData {
  id: string;
  s: GameStats;
}
