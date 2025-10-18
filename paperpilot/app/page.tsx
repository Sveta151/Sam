'use client';

import { useStore } from '@/lib/store';
import { SwipeDeck } from '@/components/swipe-deck';
import { StreakWidget } from '@/components/streak-widget';
import { NudgeCard } from '@/components/nudge-card';
import { useMemo, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PaperCard } from '@/components/paper-card';
import type { Paper } from '@/lib/types';
import { mockPapers, mockRecommendations } from '@/lib/mock';

export default function HomePage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
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

  const feedToShow = tinderFeed.length > 0 ? tinderFeed : fallbackFeed;

  if (!isHydrated) {
    return (
      <div className="content-grid">
        <div className="col-span-7">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Discover Papers</h1>
              <p className="text-muted-foreground">
                Loading...
              </p>
            </div>
          </div>
        </div>
        <div className="col-span-5 space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  // Simple local search with mock external results when no local matches
  const normalized = query.trim().toLowerCase();
  const localMatches = normalized
    ? papers.filter((p) => `${p.title} ${(p.authors||[]).join(' ')} ${(p.labels||[]).join(' ')}`.toLowerCase().includes(normalized))
    : [];

  const mockResults = normalized && localMatches.length === 0
    ? [
        { id: 'mock-1', title: `Mock result for "${query}"`, authors: ['Doe, J.'], summary2: 'This is a mocked search result. Backend TBD.' },
        { id: 'mock-2', title: `Another ${query} paper`, authors: ['Roe, R.'], summary2: 'Second mocked item for demo.' },
      ]
    : [];

  if (normalized) {
    return (
      <div className="content-grid">
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
              <div className="text-sm text-muted-foreground mb-2">No local matches. Mock results:</div>
              <div className="space-y-2">
                {mockResults.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg bg-secondary">
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.summary2}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
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
      <div className="col-span-7">
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
      <div className="col-span-5 space-y-6">
        <NudgeCard />
        <StreakWidget variant="full" />
      </div>
    </div>
  );
}
