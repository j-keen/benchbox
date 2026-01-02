-- 태그 카테고리 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. tag_categories 테이블 생성
CREATE TABLE IF NOT EXISTS tag_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. tags 테이블에 category_id 컬럼 추가
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL;

-- 3. RLS 정책 (Row Level Security)
ALTER TABLE tag_categories ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "tag_categories_select_policy" ON tag_categories
    FOR SELECT USING (true);

-- 모든 사용자가 추가/수정/삭제 가능 (개인 프로젝트용)
CREATE POLICY "tag_categories_insert_policy" ON tag_categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "tag_categories_update_policy" ON tag_categories
    FOR UPDATE USING (true);

CREATE POLICY "tag_categories_delete_policy" ON tag_categories
    FOR DELETE USING (true);

-- 4. 기본 카테고리 데이터 삽입 (선택사항)
INSERT INTO tag_categories (name, color, sort_order) VALUES
    ('콘텐츠 유형', '#ef4444', 0),
    ('장르/스타일', '#f97316', 1),
    ('촬영 기법', '#22c55e', 2),
    ('감정/분위기', '#3b82f6', 3),
    ('기타', '#6b7280', 4)
ON CONFLICT DO NOTHING;

-- 5. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_tags_category_id ON tags(category_id);
CREATE INDEX IF NOT EXISTS idx_tag_categories_sort_order ON tag_categories(sort_order);
