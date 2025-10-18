'use client';

import { useStore } from '@/lib/store';
import { SwipeDeck } from '@/components/swipe-deck';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { mockPapers, mockRecommendations } from '@/lib/mock';
import type { Paper } from '@/lib/types';

interface TinderViewProps {
  initialTrending: Paper[];
}

export default function TinderView({ initialTrending }: TinderViewProps) {
  const router = useRouter();
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);
  const [trending, setTrending] = useState<Paper[] | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  useEffect(() => {
    setTrending(initialTrending || []);
  }, [initialTrending]);

  const tinderFeed = useMemo(() => {
    const tinderRecs = recs
      .filter((r) => (r.source === 'tinder' || r.source === 'hot'))
      .sort((a, b) => b.score - a.score);

    return tinderRecs
      .map((rec) => papers.find((p) => p.id === rec.paperId))
      .filter((p): p is Paper => Boolean(p) && !(p as Paper).folderId);
  }, [papers, recs]);

  // Fallback: show mock data if persisted store is empty (first-run or cleared state)
  const fallbackFeed = useMemo(() => {
    const tinderRecs = mockRecommendations
      .filter((r) => r.source === 'tinder' || r.source === 'hot')
      .sort((a, b) => b.score - a.score);

    return tinderRecs
      .map((rec) => mockPapers.find((p) => p.id === rec.paperId))
      .filter((p): p is Paper => Boolean(p) && !(p as Paper).folderId);
  }, []);

  // Choose feed priority: trending (fresh) > tinder recs > fallback
  const feedToShow = (trending && trending.length > 0) ? trending : (tinderFeed.length > 0 ? tinderFeed : fallbackFeed);
  const feedSource = (trending && trending.length > 0) ? 'Trending' : (tinderFeed.length > 0 ? 'Recommendations' : 'Mock');

  // When user progresses past 50% of current feed, prefetch more trending
  const handleIndexChange = useCallback((index: number, total: number) => {
    if (total === 0) return;
    const progress = index / total;
    if (progress >= 0.5 && !loadingTrend) {
      setLoadingTrend(true);
      fetch('/api/trend')
        .then(async (r) => (r.ok ? r.json() : null))
        .then((json) => {
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
              labels: [],
              venue: it?.venue || undefined,
              year: it?.year || undefined,
            } as Paper;
          });
          setTrending(mapped);
        })
        .catch((e) => setTrendError(String(e?.message || e)))
        .finally(() => setLoadingTrend(false));
    }
  }, [loadingTrend]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-md lg:max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Paper Discovery</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {loadingTrend ? 'Loading trending…' : `${feedToShow.length} papers to review`} • Source: {feedSource}
              {trendError && ` • ${trendError}`}
            </p>
          </div>
        </div>

        {/* Swipe Deck */}
        <div className="-mx-2 sm:mx-0">
          <SwipeDeck papers={feedToShow} onIndexChange={handleIndexChange} />
        </div>

        {/* Instructions */}
        <div className="mt-6 sm:mt-8 text-center space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Swipe left to skip • Swipe right to save
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Or use the buttons below
          </p>
        </div>
      </div>
    </div>
  );
}


