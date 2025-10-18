'use client';

import { useStore } from '@/lib/store';
import { SwipeDeck } from '@/components/swipe-deck';
import { StreakWidget } from '@/components/streak-widget';
import { NudgeCard } from '@/components/nudge-card';
import { useMemo, useEffect, useState } from 'react';

export default function HomePage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const tinderFeed = useMemo(() => {
    const tinderRecs = recs
      .filter((r) => (r.source === 'tinder' || r.source === 'hot'))
      .sort((a, b) => b.score - a.score);

    return tinderRecs
      .map((rec) => papers.find((p) => p.id === rec.paperId))
      .filter((p) => p && !p.folderId);
  }, [papers, recs]);

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

  return (
    <div className="content-grid">
      {/* Center: Tinder Deck (spans 7 columns) */}
      <div className="col-span-7">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discover Papers</h1>
            <p className="text-muted-foreground">
              Swipe through recommended research papers
            </p>
          </div>
          
          <SwipeDeck papers={tinderFeed} />
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
