-- Create profiles table for creators/users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create tags table with categories
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('age_group', 'topic', 'vibe')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(name, category)
);

-- Create apps table
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  app_url TEXT NOT NULL,
  icon_url TEXT,
  screenshot_url TEXT,
  upvotes_count INTEGER DEFAULT 0 NOT NULL,
  tier TEXT DEFAULT 'sandbox' CHECK (tier IN ('sandbox', 'main_stage')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create app_tags junction table (many-to-many)
CREATE TABLE public.app_tags (
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (app_id, tag_id)
);

-- Create upvotes table
CREATE TABLE public.upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, app_id)
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create feedback table (private feedback to creators)
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  quick_tags TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for tags (read-only for all)
CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (true);

-- RLS Policies for apps
CREATE POLICY "Apps are viewable by everyone" ON public.apps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create apps" ON public.apps FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own apps" ON public.apps FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their own apps" ON public.apps FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for app_tags
CREATE POLICY "App tags are viewable by everyone" ON public.app_tags FOR SELECT USING (true);
CREATE POLICY "Creators can add tags to their apps" ON public.app_tags FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND creator_id = auth.uid()));
CREATE POLICY "Creators can remove tags from their apps" ON public.app_tags FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND creator_id = auth.uid()));

-- RLS Policies for upvotes
CREATE POLICY "Upvotes are viewable by everyone" ON public.upvotes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upvote apps" ON public.upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their upvotes" ON public.upvotes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for feedback
CREATE POLICY "Users can view feedback they sent" ON public.feedback FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Creators can view feedback on their apps" ON public.feedback FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND creator_id = auth.uid()));
CREATE POLICY "Authenticated users can send feedback" ON public.feedback FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creators can mark feedback as read" ON public.feedback FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND creator_id = auth.uid()));

-- Create function to update upvotes_count
CREATE OR REPLACE FUNCTION public.update_app_upvotes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.apps SET upvotes_count = upvotes_count + 1 WHERE id = NEW.app_id;
    -- Check if app should be promoted to main_stage
    UPDATE public.apps SET tier = 'main_stage' WHERE id = NEW.app_id AND upvotes_count >= 50;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.apps SET upvotes_count = upvotes_count - 1 WHERE id = OLD.app_id;
    -- Check if app should be demoted to sandbox
    UPDATE public.apps SET tier = 'sandbox' WHERE id = OLD.app_id AND upvotes_count < 50;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for upvotes
CREATE TRIGGER on_upvote_change
AFTER INSERT OR DELETE ON public.upvotes
FOR EACH ROW EXECUTE FUNCTION public.update_app_upvotes_count();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON public.apps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tags
INSERT INTO public.tags (name, category) VALUES
  -- Age Groups
  ('Toddlers (1-3)', 'age_group'),
  ('Pre-K (3-5)', 'age_group'),
  ('Elementary (5-10)', 'age_group'),
  ('Tweens (10-13)', 'age_group'),
  ('Teens (13+)', 'age_group'),
  ('Parents', 'age_group'),
  -- Topics
  ('Math', 'topic'),
  ('Reading', 'topic'),
  ('Science', 'topic'),
  ('Creativity', 'topic'),
  ('Chores', 'topic'),
  ('Emotional Intelligence', 'topic'),
  ('Music', 'topic'),
  ('Coding', 'topic'),
  ('Life Skills', 'topic'),
  -- Vibes
  ('Screen-free', 'vibe'),
  ('Voice-only', 'vibe'),
  ('Game', 'vibe'),
  ('Utility', 'vibe'),
  ('Educational', 'vibe'),
  ('Relaxing', 'vibe'),
  ('Active', 'vibe');