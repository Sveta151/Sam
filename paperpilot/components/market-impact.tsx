'use client';

import { Card } from '@/components/ui/card';

export default function MarketImpact() {
  return (
    <Card className="p-6 md:p-8 border-border/40">
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold text-primary">Market Impact</div>
          <h2 className="text-2xl md:text-3xl font-bold mt-1">Why this product matters</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-3xl">
            The global research market is massive and rapidly growing. Our app tackles severe information overload for
            millions of researchers by organizing and synthesizing exponentially growing literature.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-border/40 bg-secondary/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Researchers</div>
            <div className="text-2xl font-bold mt-1">8.8M → 10.8M+</div>
            <div className="text-xs text-muted-foreground mt-1">Worldwide by 2025</div>
          </Card>

          <Card className="p-4 border-border/40 bg-secondary/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Publication Volume</div>
            <div className="text-2xl font-bold mt-1">3.3M+ / year</div>
            <div className="text-xs text-muted-foreground mt-1">+4–5.6% YoY, +28.8% since 2019</div>
          </Card>

          <Card className="p-4 border-border/40 bg-secondary/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Reference Tools</div>
            <div className="text-2xl font-bold mt-1">$400M → $760M</div>
            <div className="text-xs text-muted-foreground mt-1">2024 to 2033 market growth</div>
          </Card>

          <Card className="p-4 border-border/40 bg-secondary/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">AI Dependency</div>
            <div className="text-2xl font-bold mt-1">90%+ growth</div>
            <div className="text-xs text-muted-foreground mt-1">OpenAI/Anthropic rely on research</div>
          </Card>
        </div>

        <div className="text-sm text-muted-foreground max-w-3xl">
          Our product targets a $400M+ market serving 10M+ researchers who are overwhelmed by the pace of publications.
          We help them search, triage, and synthesize faster.
        </div>
      </div>
    </Card>
  );
}


