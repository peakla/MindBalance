-- =====================================================
-- MINDBALANCE - COMPLETE FRESH INSTALL
-- WARNING: This deletes ALL existing data!
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- DROP ALL EXISTING POLICIES FIRST
-- =====================================================
-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Posts policies
DROP POLICY IF EXISTS "Anyone can view visible posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Post likes policies
DROP POLICY IF EXISTS "Anyone can view likes" ON post_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;

-- Post comments policies
DROP POLICY IF EXISTS "Anyone can view comments" ON post_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;

-- Post reports policies
DROP POLICY IF EXISTS "Users can submit reports" ON post_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON post_reports;

-- Likes policies
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Followers policies
DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Users can unfollow" ON followers;

-- Achievements policies
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
DROP POLICY IF EXISTS "Anyone can view user achievements" ON user_achievements;
DROP POLICY IF EXISTS "System can grant achievements" ON user_achievements;

-- Saved articles policies
DROP POLICY IF EXISTS "Users can view own saved articles" ON saved_articles;
DROP POLICY IF EXISTS "Users can save articles" ON saved_articles;
DROP POLICY IF EXISTS "Users can unsave articles" ON saved_articles;

-- Mood logs policies
DROP POLICY IF EXISTS "Users can view own mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can create mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can delete own mood logs" ON mood_logs;

-- Wellness goals policies
DROP POLICY IF EXISTS "Users can view own goals" ON wellness_goals;
DROP POLICY IF EXISTS "Users can create goals" ON wellness_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON wellness_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON wellness_goals;

-- User engagement policies
DROP POLICY IF EXISTS "Users can view own engagement" ON user_engagement;
DROP POLICY IF EXISTS "Users can insert own engagement" ON user_engagement;
DROP POLICY IF EXISTS "Users can update own engagement" ON user_engagement;

-- User activity logs policies
DROP POLICY IF EXISTS "Users can view own activity" ON user_activity_logs;
DROP POLICY IF EXISTS "Users can log own activity" ON user_activity_logs;

-- Reading progress policies
DROP POLICY IF EXISTS "Users can view own reading progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can track reading progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can update reading progress" ON reading_progress;

-- Newsletter policies
DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter_subscribers;

-- Resource suggestions policies
DROP POLICY IF EXISTS "Authenticated users can submit suggestions" ON resource_suggestions;
DROP POLICY IF EXISTS "Users can view own suggestions" ON resource_suggestions;

-- Storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete their avatar" ON storage.objects;

-- =====================================================
-- DROP ALL EXISTING TABLES (correct order for foreign keys)
-- =====================================================
DROP TABLE IF EXISTS post_reports CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS saved_articles CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS mood_logs CASCADE;
DROP TABLE IF EXISTS wellness_goals CASCADE;
DROP TABLE IF EXISTS user_engagement CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS reading_progress CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS resource_suggestions CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_user_reputation(UUID);
DROP FUNCTION IF EXISTS update_user_streak(UUID);

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  theme_color TEXT DEFAULT '#d4a574',
  social_links JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  show_activity BOOLEAN DEFAULT TRUE,
  show_saved BOOLEAN DEFAULT FALSE,
  reputation_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- =====================================================
-- 2. POSTS TABLE (Community Hub)
-- =====================================================
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  image_url TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible posts" ON posts
  FOR SELECT USING (is_hidden = false);

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = author_id);

-- =====================================================
-- 3. POST LIKES TABLE
-- =====================================================
CREATE TABLE post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON post_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like posts" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. POST COMMENTS TABLE
-- =====================================================
CREATE TABLE post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON post_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments" ON post_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments" ON post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- =====================================================
-- 5. POST REPORTS TABLE (Moderation)
-- =====================================================
CREATE TABLE post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports" ON post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON post_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- =====================================================
-- 6. LIKES TABLE (Generic - for various content)
-- =====================================================
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 8. FOLLOWERS TABLE
-- =====================================================
CREATE TABLE followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view followers" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- =====================================================
-- 9. ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  criteria JSONB
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON achievements
  FOR SELECT USING (true);

-- Seed default achievements
INSERT INTO achievements (id, name, description, icon, category, points, criteria) VALUES
  ('first_post', 'First Steps', 'Created your first community post', 'create-outline', 'community', 10, '{"posts": 1}'),
  ('five_posts', 'Active Voice', 'Created 5 community posts', 'chatbubbles-outline', 'community', 25, '{"posts": 5}'),
  ('first_comment', 'Joining In', 'Left your first comment', 'chatbubble-outline', 'community', 10, '{"comments": 1}'),
  ('helpful_member', 'Helpful Member', 'Received 10 likes on your posts', 'heart-outline', 'community', 50, '{"likes_received": 10}'),
  ('popular_voice', 'Popular Voice', 'Received 50 likes on your posts', 'star-outline', 'community', 100, '{"likes_received": 50}'),
  ('week_streak', '7 Day Streak', 'Visited MindBalance 7 days in a row', 'flame-outline', 'engagement', 30, '{"streak": 7}'),
  ('month_streak', '30 Day Streak', 'Visited MindBalance 30 days in a row', 'ribbon-outline', 'engagement', 100, '{"streak": 30}'),
  ('first_save', 'Bookworm', 'Saved your first article', 'bookmark-outline', 'reading', 10, '{"saves": 1}'),
  ('mood_tracker', 'Self Aware', 'Logged your mood 7 times', 'happy-outline', 'wellness', 25, '{"mood_logs": 7}'),
  ('goal_setter', 'Goal Setter', 'Created your first wellness goal', 'flag-outline', 'wellness', 15, '{"goals": 1}'),
  ('goal_achiever', 'Goal Achiever', 'Completed a wellness goal', 'trophy-outline', 'wellness', 50, '{"goals_completed": 1}'),
  ('profile_complete', 'Complete Profile', 'Added avatar, bio, and social links', 'person-outline', 'profile', 20, '{"profile_complete": true}');

-- =====================================================
-- 10. USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user achievements" ON user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can grant achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 11. SAVED ARTICLES TABLE
-- =====================================================
CREATE TABLE saved_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  article_title TEXT NOT NULL,
  article_category TEXT,
  article_image TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_slug)
);

ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved articles" ON saved_articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save articles" ON saved_articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave articles" ON saved_articles
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 12. MOOD LOGS TABLE
-- =====================================================
CREATE TABLE mood_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mood logs" ON mood_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create mood logs" ON mood_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood logs" ON mood_logs
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 13. WELLNESS GOALS TABLE
-- =====================================================
CREATE TABLE wellness_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  target_value INTEGER DEFAULT 1,
  current_value INTEGER DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wellness_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON wellness_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create goals" ON wellness_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON wellness_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON wellness_goals
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 14. USER ENGAGEMENT TABLE (Reading Streaks)
-- =====================================================
CREATE TABLE user_engagement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  articles_read INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, visit_date)
);

ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagement" ON user_engagement
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can log engagement" ON user_engagement
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement" ON user_engagement
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 15. USER ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs" ON user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create activity logs" ON user_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 16. READING PROGRESS TABLE
-- =====================================================
CREATE TABLE reading_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  scroll_depth INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_slug)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading progress" ON reading_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reading progress" ON reading_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress" ON reading_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 17. NEWSLETTER SUBSCRIBERS TABLE
-- =====================================================
CREATE TABLE newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own subscription" ON newsletter_subscribers
  FOR SELECT USING (true);

-- =====================================================
-- 18. RESOURCE SUGGESTIONS TABLE
-- =====================================================
CREATE TABLE resource_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT,
  category TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resource_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit suggestions" ON resource_suggestions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own suggestions" ON resource_suggestions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================
-- 19. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate user reputation
CREATE OR REPLACE FUNCTION calculate_user_reputation(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_reputation INTEGER := 0;
  post_likes INTEGER;
  comment_count INTEGER;
  achievement_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(p.like_count), 0) INTO post_likes
  FROM posts p WHERE p.author_id = user_uuid;
  
  SELECT COUNT(*) INTO comment_count
  FROM post_comments WHERE author_id = user_uuid;
  
  SELECT COALESCE(SUM(a.points), 0) INTO achievement_points
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = user_uuid;
  
  total_reputation := (post_likes * 2) + (comment_count * 1) + achievement_points;
  
  RETURN total_reputation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  last_visit DATE;
  new_streak INTEGER;
BEGIN
  SELECT last_visit_date, current_streak INTO last_visit, new_streak
  FROM profiles WHERE id = user_uuid;
  
  IF last_visit IS NULL OR last_visit < CURRENT_DATE - INTERVAL '1 day' THEN
    new_streak := 1;
  ELSIF last_visit = CURRENT_DATE - INTERVAL '1 day' THEN
    new_streak := COALESCE(new_streak, 0) + 1;
  END IF;
  
  UPDATE profiles SET 
    current_streak = new_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), new_streak),
    last_visit_date = CURRENT_DATE
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 20. ENABLE REALTIME
-- =====================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE posts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE post_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE post_likes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE followers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE saved_articles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE mood_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wellness_goals; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 21. CREATE STORAGE BUCKET FOR AVATARS
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete their avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');

-- =====================================================
-- COMPLETE! All 18 tables + 2 functions created.
-- =====================================================
SELECT 'SUCCESS: All tables and functions created!' as status;