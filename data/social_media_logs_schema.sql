-- ==========================================
-- 1. Table unifiée pour les logs de publication Social Media
-- ==========================================
CREATE TABLE IF NOT EXISTS social_media_posts_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL, -- 'instagram', 'facebook_page', 'facebook_group', 'tiktok', 'pinterest'
    file_path TEXT NOT NULL, -- Identifiant unique du contenu (ex: chemin R2 ou Supabase)
    status TEXT DEFAULT 'pending', -- 'published', 'failed', 'pending', 'skipped'
    post_id TEXT, -- ID renvoyé par la plateforme
    post_url TEXT, -- Lien direct vers le post
    caption TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    metadata JSONB, -- Stockage flexible pour infos supplémentaires (tags, comptes tagués, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour éviter les doublons de publication
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_media_unique_post 
ON social_media_posts_logs (platform, file_path);

-- ==========================================
-- 2. Table pour les logs du Bot Messenger Facebook (Organisateurs)
-- ==========================================
CREATE TABLE IF NOT EXISTS facebook_messenger_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_name TEXT NOT NULL,
    festival_date TEXT, -- Pour distinguer les années (ex: "2026-02-20")
    organizer_name TEXT,
    event_url TEXT,
    message_content TEXT,
    status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- Index pour vérifier rapidement si on a déjà contacté un festival
CREATE INDEX IF NOT EXISTS idx_fb_messenger_festival 
ON facebook_messenger_logs (festival_name);
