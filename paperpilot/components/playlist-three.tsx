'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Paper } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { PaperCard } from './paper-card';
import { DecisionModal } from './decision-modal';

interface PlaylistThreeProps {
  papers: Paper[];
}

export function PlaylistThree({ papers }: PlaylistThreeProps) {
  const [modalPaper, setModalPaper] = useState<Paper | null>(null);

  const handlePaperClick = (paper: Paper) => {
    setModalPaper(paper);
  };

  if (papers.length === 0) {
    return (
      <Card className="p-6 border-border/40">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold">Recommended for You</h3>
            <p className="text-sm text-muted-foreground">
              No recommendations yet
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 border-border/40">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold">Recommended for You</h3>
            <p className="text-sm text-muted-foreground">
              Top {papers.length} picks for this folder
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {papers.slice(0, 3).map((paper) => (
            <div key={paper.id} onClick={() => handlePaperClick(paper)}>
              <PaperCard paper={paper} mode="compact" />
            </div>
          ))}
        </div>
      </Card>

      <DecisionModal
        paper={modalPaper}
        open={!!modalPaper}
        onClose={() => setModalPaper(null)}
      />
    </>
  );
}

