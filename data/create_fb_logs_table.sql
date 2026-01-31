CREATE TABLE facebook_comment_logs (
    comment_id TEXT PRIMARY KEY,
    post_id TEXT,
    parent_id TEXT, -- Si c'est une réponse à un commentaire
    user_name TEXT,
    user_id TEXT,
    comment_text TEXT,
    intent TEXT, -- 'search_flight', 'question', 'other'
    extracted_origin TEXT, -- Code IATA ou Ville
    extracted_destination TEXT, -- Code IATA ou Ville
    extracted_date TEXT,
    reply_text TEXT,
    reply_link TEXT, -- Lien vers le deal ou Aviasales
    status TEXT DEFAULT 'processed', -- 'pending', 'processed', 'ignored'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour éviter les doublons et accélérer la recherche
CREATE INDEX idx_fb_comments_post_id ON facebook_comment_logs(post_id);
CREATE INDEX idx_fb_comments_status ON facebook_comment_logs(status);
