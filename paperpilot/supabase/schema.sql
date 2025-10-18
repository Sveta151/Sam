-- Supabase Database Schema for PaperPilot
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- ============================================================================
-- PROJECTS TABLE
-- Top-level organization unit for research projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain_focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FOLDERS TABLE
-- Hierarchical folder structure within projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAPERS TABLE
-- Individual research papers with metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  venue TEXT,
  year INT,
  citations INT,
  storage_path TEXT NOT NULL,  -- e.g., papers/<proj>/<fold>/<uuid>.pdf
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ASSET KIND ENUM
-- Types of generated assets per paper
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE asset_kind AS ENUM ('audio', 'video', 'thumb', 'transcript', 'json');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PAPER ASSETS TABLE
-- Generated assets (audio, video, thumbnails, etc.) for each paper
-- ============================================================================
CREATE TABLE IF NOT EXISTS paper_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  kind asset_kind NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  bytes BIGINT,
  etag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_papers_project_id ON papers(project_id);
CREATE INDEX IF NOT EXISTS idx_papers_folder_id ON papers(folder_id);
CREATE INDEX IF NOT EXISTS idx_paper_assets_paper_id ON paper_assets(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_assets_kind ON paper_assets(kind);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- DISABLED FOR HACKATHON - Enable after adding authentication
-- ============================================================================
-- For hackathon speed, we're disabling RLS on all tables
-- TODO: Enable RLS and add auth policies after demo
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE papers DISABLE ROW LEVEL SECURITY;
ALTER TABLE paper_assets DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUTURE: When adding authentication, enable RLS and add policies like:
-- ============================================================================
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can view their own projects"
--   ON projects FOR SELECT
--   USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can create their own projects"
--   ON projects FOR INSERT
--   WITH CHECK (auth.uid() = user_id);
-- 
-- (Similar policies for folders, papers, paper_assets)
-- ============================================================================

-- Success message
DO $$ BEGIN
  RAISE NOTICE 'Schema created successfully! All tables and indexes are ready.';
END $$;

