'use client';

import { useStore } from '@/lib/store';
import { SwipeDeck } from '@/components/swipe-deck';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

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
      .filter((p) => p && !p.folderId);
  }, [papers, recs]);

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
              {tinderFeed.length} papers to review
            </p>
          </div>
        </div>

        {/* Swipe Deck */}
        <SwipeDeck papers={tinderFeed} />

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

