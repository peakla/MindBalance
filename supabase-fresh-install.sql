-- =====================================================
-- FRESH INSTALL - DROP AND RECREATE ALL TABLES
-- WARNING: This deletes all existing data!
-- Run this in Supabase SQL Editor
-- =====================================================

-- DROP EXISTING TABLES (in correct order due to foreign keys)
DROP TABLE IF EXISTS saved_articles CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS mood_logs CASCADE;
DROP TABLE IF EXISTS wellness_goals CASCADE;
DROP TABLE IF EXISTS user_engagement CASCADE;

-- =====================================================
-- 1. SAVED ARTICLES TABLE
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

DROP POLICY IF EXISTS "Users can view own saved articles" ON saved_articles;
DROP POLICY IF EXISTS "Users can save articles" ON saved_articles;
DROP POLICY IF EXISTS "Users can unsave articles" ON saved_articles;

CREATE POLICY "Users can view own saved articles" ON saved_articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save articles" ON saved_articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave articles" ON saved_articles
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. FOLLOWERS TABLE
-- =====================================================
CREATE TABLE followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Users can unfollow" ON followers;

CREATE POLICY "Anyone can view followers" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- =====================================================
-- 3. ACHIEVEMENTS TABLE
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

DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
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
-- 4. USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user achievements" ON user_achievements;
DROP POLICY IF EXISTS "System can grant achievements" ON user_achievements;

CREATE POLICY "Anyone can view user achievements" ON user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can grant achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. MOOD LOGS TABLE
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

DROP POLICY IF EXISTS "Users can view own mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can create mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can delete own mood logs" ON mood_logs;

CREATE POLICY "Users can view own mood logs" ON mood_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create mood logs" ON mood_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood logs" ON mood_logs
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 6. WELLNESS GOALS TABLE
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

DROP POLICY IF EXISTS "Users can view own goals" ON wellness_goals;
DROP POLICY IF EXISTS "Users can create goals" ON wellness_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON wellness_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON wellness_goals;

CREATE POLICY "Users can view own goals" ON wellness_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create goals" ON wellness_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON wellness_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON wellness_goals
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. USER ENGAGEMENT TABLE (reading streaks)
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

DROP POLICY IF EXISTS "Users can view own engagement" ON user_engagement;
DROP POLICY IF EXISTS "Users can log engagement" ON user_engagement;
DROP POLICY IF EXISTS "Users can update own engagement" ON user_engagement;

CREATE POLICY "Users can view own engagement" ON user_engagement
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can log engagement" ON user_engagement
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement" ON user_engagement
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- ENABLE REALTIME (optional)
-- =====================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE saved_articles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE followers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mood_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wellness_goals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- DONE! All tables created fresh.
-- =====================================================
SELECT 'SUCCESS: All tables created!' as status;