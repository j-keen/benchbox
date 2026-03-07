-- saved_comments 테이블 생성
-- 사용자가 영상 댓글을 북마크하고 메모를 남길 수 있는 기능

CREATE TABLE saved_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    author VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    published_at VARCHAR(50),
    memo TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_saved_comments_video_id ON saved_comments(video_id);
CREATE INDEX idx_saved_comments_created_at ON saved_comments(created_at DESC);

-- RLS 정책 (전체 허용 - 기존 패턴과 동일)
ALTER TABLE saved_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to saved_comments"
    ON saved_comments
    FOR ALL
    USING (true)
    WITH CHECK (true);
