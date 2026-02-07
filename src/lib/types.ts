export type TagCategory = 'age_group' | 'topic' | 'vibe';

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_creator: boolean;
  created_at: string;
}

export interface App {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  app_url: string;
  icon_url: string | null;
  screenshot_url: string | null;
  upvotes_count: number;
  tier: 'sandbox' | 'main_stage';
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: Profile;
  tags?: Tag[];
}

export interface Upvote {
  id: string;
  user_id: string;
  app_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type QuickFeedbackTag = 
  | 'Educational'
  | 'Fun'
  | 'Glitchy'
  | 'Hard to Use'
  | 'Age Appropriate'
  | 'Too Easy'
  | 'Too Hard'
  | 'Great Design'
  | 'Needs Polish';

export const QUICK_FEEDBACK_TAGS: QuickFeedbackTag[] = [
  'Educational',
  'Fun',
  'Glitchy',
  'Hard to Use',
  'Age Appropriate',
  'Too Easy',
  'Too Hard',
  'Great Design',
  'Needs Polish',
];
