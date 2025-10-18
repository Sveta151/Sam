'use client';

import { useStore } from '@/lib/store';
import { SwipeDeck } from '@/components/swipe-deck';
import { StreakWidget } from '@/components/streak-widget';
import { NudgeCard } from '@/components/nudge-card';
import { useMemo, useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PaperCard } from '@/components/paper-card';
import type { Paper } from '@/lib/types';
import { mockPapers, mockRecommendations } from '@/lib/mock';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);
  const addProject = useStore((state) => state.addProject);
  const addPaper = useStore((state) => state.addPaper);
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<Paper[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Seed Demo Project + sample paper once
  useEffect(() => {
    if (!isHydrated) return;
    const hasDemo = papers.some((p) => p.id === 'demo-sample-paper');
    if (hasDemo) return;
    const existingDemoProject = (useStore.getState().projects || []).find((p) => p.id === 'demo-project');
    if (!existingDemoProject) {
      addProject({ id: 'demo-project', name: 'Demo Project', domainFocus: 'Wireless communications' });
    }
    addPaper({
      id: 'demo-sample-paper',
      title: 'Enhancing LoRa Reception with Generative Models (Demo)',
      authors: ['Demo Author'],
      projectId: 'demo-project',
      originalFileName: '3666025.3699354.pdf',
      mimeType: 'application/pdf',
      fileUrl: '/3666025.3699354.pdf',
      sizeBytes: undefined,
    });
  }, [isHydrated, papers, addProject, addPaper]);

  // Prefetch trending stack for home tinder section
  useEffect(() => {
    let cancelled = false;
    fetch('/api/trend', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const items = Array.isArray(json?.results) ? json.results : [];
        if (items.length === 0) return;
        const mapped: Paper[] = items.map((it: any, idx: number) => {
          const authorsRaw = it?.authors || [];
          const authors = Array.isArray(authorsRaw)
            ? authorsRaw.map((a: any) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean)
            : (typeof authorsRaw === 'string' ? [authorsRaw] : []);
          const id = it?.paper?.id || it?.paperId || it?.id || `trend-${Date.now()}-${idx}`;
          return {
            id: String(id),
            title: it?.title || it?.paper?.title || 'Untitled',
            authors,
            summary2: it?.summary || it?.highlights || it?.paper?.summary || '',
            labels: (it?.ai_keywords && Array.isArray(it.ai_keywords)) ? it.ai_keywords.slice(0, 6) : [],
            venue: it?.venue || undefined,
            year: it?.year || (it?.publishedAt ? new Date(it.publishedAt).getFullYear() : undefined),
            link: it?.links?.arxiv || it?.links?.source || it?.githubrepo || undefined,
            upvotes: typeof it?.upvotes === 'number' ? it.upvotes : undefined,
            stars: typeof it?.githubstart === 'number' ? it.githubstart : undefined,
            githubRepo: typeof it?.githubrepo === 'string' ? it.githubrepo : undefined,
          } as Paper;
        });
        setTrending(mapped);
      })
      .catch(() => {})
    return () => { cancelled = true; };
  }, []);
  
  // Simple local search with mock external results when no local matches
  const normalized = query.trim().toLowerCase();
  const localMatches = normalized
    ? papers.filter((p) => `${p.title} ${(p.authors||[]).join(' ')} ${(p.labels||[]).join(' ')}`.toLowerCase().includes(normalized))
    : [];

  // Debounced remote search against backend when there are no local matches
  useEffect(() => {
    if (!normalized) {
      setRemoteResults([]);
      setSearchError(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    const handle = setTimeout(async () => {
      // If we already have local matches, prefer them and skip remote
      if (localMatches.length > 0) {
        setRemoteResults([]);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query, limit: 10 }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Search failed');
        }
        const json = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        setRemoteResults(results);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setRemoteResults([]);
        setSearchError(String(err?.message || err));
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [normalized, query, localMatches.length]);

  const tinderFeed = useMemo(() => {
    const tinderRecs = recs
      .filter((r) => (r.source === 'tinder' || r.source === 'hot'))
      .sort((a, b) => b.score - a.score);

    return tinderRecs
      .map((rec) => papers.find((p) => p.id === rec.paperId))
      .filter((p): p is Paper => Boolean(p && !(p.folderId || p.projectId)));
  }, [papers, recs]);

  // Fallback to mocks when store has no recommendations/papers yet
  const fallbackFeed = useMemo(() => {
    const tinderRecs = mockRecommendations
      .filter((r) => r.source === 'tinder' || r.source === 'hot')
      .sort((a, b) => b.score - a.score);

    return tinderRecs
      .map((rec) => mockPapers.find((p) => p.id === rec.paperId))
      .filter((p): p is Paper => Boolean(p && !(p.folderId || p.projectId)));
  }, []);

  const feedToShow = (trending && trending.length > 0) ? trending : (tinderFeed.length > 0 ? tinderFeed : fallbackFeed);

  if (!isHydrated) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-6 max-w-screen-2xl mx-auto">
        <div className="col-span-12 md:col-span-7">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Discover Papers</h1>
              <p className="text-muted-foreground">
                Loading...
              </p>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-5 space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (normalized) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-6 max-w-screen-2xl mx-auto">
        <div className="col-span-12 mb-4">
          <Input
            placeholder="Search papers (title, author, labels)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 text-base font-semibold px-6"
          />
        </div>
        <div className="col-span-12">
          {localMatches.length > 0 ? (
            <div className="space-y-2">
              {localMatches.slice(0, 10).map((p) => (
                <PaperCard key={p.id} paper={p} mode="compact" />
              ))}
            </div>
          ) : (
            <Card className="p-4 border-border/40">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  {isSearching ? 'Searching...' : 'Results from remote search'}
                </div>
                {remoteResults.length > 0 && (
                  <div className="text-xs text-muted-foreground">{remoteResults.length} results</div>
                )}
              </div>
              {searchError && (
                <div className="text-xs text-red-500 mb-2">{searchError}</div>
              )}
              <div className="space-y-2">
                {remoteResults.slice(0, 10).map((r, idx) => {
                  const paper = r?.paper || {};
                  const title = r?.title || paper?.title || r?.paperTitle || 'Untitled';
                  const authorsRaw = r?.authors || r?.paperAuthors || paper?.authors || paper?.paperAuthors || [];
                  const authors = Array.isArray(authorsRaw)
                    ? authorsRaw.map((a: any) => (typeof a === 'string' ? a : a?.name || a?.user?.fullname || a?.user?.name || '')).filter(Boolean)
                    : (typeof authorsRaw === 'string' ? [authorsRaw] : []);
                  const summary = r?.summary || r?.highlights || paper?.summary || paper?.highlights || '';
                  const links = r?.links || paper?.links || {};
                  const primaryUrl = links?.arxiv || links?.huggingface || links?.source || links?.pdf || links?.github;
                  const provider = r?.provider || paper?.provider || '';
                  return (
                    <div key={r?.id || r?.paperId || paper?.id || idx} className="p-3 rounded-lg bg-secondary">
                      <div className="font-medium flex items-center gap-2">
                        <a
                          href={primaryUrl || '#'}
                          target={primaryUrl ? '_blank' : '_self'}
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {title}
                        </a>
                        {provider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-border/60 text-muted-foreground uppercase tracking-wide">{provider}</span>
                        )}
                      </div>
                      {authors.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">{authors.join(', ')}</div>
                      )}
                      {summary && (
                        <div className="text-xs text-muted-foreground mt-2 line-clamp-3">{summary}</div>
                      )}
                    </div>
                  );
                })}
                {!isSearching && !searchError && remoteResults.length === 0 && (
                  <div className="text-xs text-muted-foreground">No results found.</div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Full-width search */}
      <div className="col-span-12 mb-4">
        <Input
          placeholder="Search papers (title, author, labels)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-14 text-base font-semibold px-6"
        />
      </div>
      {/* Center: Tinder Deck (spans 7 columns) */}
      <div className="col-span-12 md:col-span-7">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discover Papers</h1>
            <p className="text-muted-foreground">
              Swipe through recommended research papers
            </p>
          </div>

          {/* Highlighted Tinder deck */}
          <Card className="p-4 border-2 border-primary/30">
            <div className="px-2 py-1 text-sm font-semibold text-primary mb-3">Papers you may like</div>
            <SwipeDeck papers={feedToShow} />
          </Card>
        </div>
      </div>

      {/* Right: Nudges & Streaks (spans 5 columns) */}
      <div className="col-span-12 md:col-span-5 space-y-6">
        <NudgeCard />
        <StreakWidget variant="full" />
      </div>
    </div>
  );
}
