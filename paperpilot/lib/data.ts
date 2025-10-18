/**
 * Server-side data query helpers
 * 
 * IMPORTANT: This file should ONLY be imported in server-side code
 * (API routes, server components, server actions)
 */

import { sbServer } from './supabase/client';
import type { Database } from './supabase/client';

type Project = Database['public']['Tables']['projects']['Row'];
type Folder = Database['public']['Tables']['folders']['Row'];
type Paper = Database['public']['Tables']['papers']['Row'];
type PaperAsset = Database['public']['Tables']['paper_assets']['Row'];

/**
 * List all projects
 */
export async function listProjects(): Promise<Project[]> {
  const { data, error } = await sbServer
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await sbServer
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data;
}

/**
 * Create a new project
 */
export async function createProject(
  name: string,
  domainFocus?: string
): Promise<Project | null> {
  const { data, error } = await sbServer
    .from('projects')
    .insert({ name, domain_focus: domainFocus })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data;
}

/**
 * List folders for a project
 */
export async function listFolders(projectId: string): Promise<Folder[]> {
  const { data, error } = await sbServer
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single folder by ID
 */
export async function getFolder(folderId: string): Promise<Folder | null> {
  const { data, error } = await sbServer
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .single();

  if (error) {
    console.error('Error fetching folder:', error);
    return null;
  }

  return data;
}

/**
 * Create a new folder
 */
export async function createFolder(
  projectId: string,
  name: string,
  parentId?: string,
  tags?: string[]
): Promise<Folder | null> {
  const { data, error } = await sbServer
    .from('folders')
    .insert({
      project_id: projectId,
      name,
      parent_id: parentId,
      tags: tags || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    return null;
  }

  return data;
}

/**
 * List papers with optional filters
 */
export async function listPapers(filters?: {
  projectId?: string;
  folderId?: string;
  includeSubfolders?: boolean;
}): Promise<Paper[]> {
  let query = sbServer.from('papers').select('*');

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  if (filters?.folderId) {
    if (filters.includeSubfolders) {
      // TODO: Implement recursive subfolder query
      // For now, just query the specific folder
      query = query.eq('folder_id', filters.folderId);
    } else {
      query = query.eq('folder_id', filters.folderId);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching papers:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single paper by ID
 */
export async function getPaper(paperId: string): Promise<Paper | null> {
  const { data, error } = await sbServer
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (error) {
    console.error('Error fetching paper:', error);
    return null;
  }

  return data;
}

/**
 * Create a new paper record
 */
export async function createPaper(paper: {
  projectId: string;
  folderId?: string;
  title: string;
  authors?: string[];
  venue?: string;
  year?: number;
  citations?: number;
  storagePath: string;
  publicUrl: string;
}): Promise<Paper | null> {
  const { data, error } = await sbServer
    .from('papers')
    .insert({
      project_id: paper.projectId,
      folder_id: paper.folderId,
      title: paper.title,
      authors: paper.authors || [],
      venue: paper.venue,
      year: paper.year,
      citations: paper.citations,
      storage_path: paper.storagePath,
      public_url: paper.publicUrl,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating paper:', error);
    return null;
  }

  return data;
}

/**
 * List assets for a paper
 */
export async function listPaperAssets(paperId: string): Promise<PaperAsset[]> {
  const { data, error } = await sbServer
    .from('paper_assets')
    .select('*')
    .eq('paper_id', paperId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching paper assets:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new paper asset record
 */
export async function createPaperAsset(asset: {
  paperId: string;
  kind: 'audio' | 'video' | 'thumb' | 'transcript' | 'json';
  storagePath: string;
  publicUrl: string;
  bytes?: number;
  etag?: string;
}): Promise<PaperAsset | null> {
  const { data, error } = await sbServer
    .from('paper_assets')
    .insert({
      paper_id: asset.paperId,
      kind: asset.kind,
      storage_path: asset.storagePath,
      public_url: asset.publicUrl,
      bytes: asset.bytes,
      etag: asset.etag,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating paper asset:', error);
    return null;
  }

  return data;
}

/**
 * Get papers for a folder (used in project view)
 */
export async function getPapersForFolder(
  projectId: string,
  folderId?: string,
  includeSubfolders: boolean = false
): Promise<Paper[]> {
  return listPapers({
    projectId,
    folderId,
    includeSubfolders,
  });
}

