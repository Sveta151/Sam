'use client';

import { useStore } from '@/lib/store';
import { SwipeDeck } from '@/components/swipe-deck';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { mockPapers, mockRecommendations } from '@/lib/mock';
import type { Paper } from '@/lib/types';

export default function TinderPage() {
  const router = useRouter();
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);
  
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

  const feedToShow = tinderFeed.length > 0 ? tinderFeed : fallbackFeed;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Paper Discovery</h1>
          <p className="text-sm text-muted-foreground">
              {feedToShow.length} papers to review
            </p>
          </div>
        </div>

        {/* Swipe Deck */}
      <SwipeDeck papers={feedToShow} />

        {/* Instructions */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Swipe left to skip • Swipe right to save
          </p>
          <p className="text-xs text-muted-foreground">
            Or use the buttons below
          </p>
        </div>
      </div>
    </div>
  );
}

