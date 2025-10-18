'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, FileText, Sparkles } from 'lucide-react';

export function ActionTiles({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Card className="p-4 border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Summarize</div>
              <div className="text-xs text-muted-foreground">Key contributions and limitations</div>
            </div>
          </div>
          <Button size="sm" disabled={disabled}>Generate</Button>
        </div>
      </Card>

      <Card className="p-4 border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Podcast</div>
              <div className="text-xs text-muted-foreground">Create an audio explainer</div>
            </div>
          </div>
          <Button size="sm" disabled={disabled}>Create</Button>
        </div>
      </Card>

      <Card className="p-4 border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Notes</div>
              <div className="text-xs text-muted-foreground">Start a reading log</div>
            </div>
          </div>
          <Button size="sm" disabled={disabled}>Open</Button>
        </div>
      </Card>
    </div>
  );
}


