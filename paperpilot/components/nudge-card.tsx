'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

export function NudgeCard() {
  const router = useRouter();
  const reads = useStore((state) => state.reads);
  
  const todayMinutes = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayReads = reads.filter((r) => r.dateISO === today);
    const totalSeconds = todayReads.reduce((sum, r) => sum + r.secondsActive, 0);
    return Math.floor(totalSeconds / 60);
  }, [reads]);
  
  const dailyGoal = 30;

  if (todayMinutes >= dailyGoal) {
    return null; // Don't show if goal is met
  }

  const remaining = dailyGoal - todayMinutes;

  return (
    <Card className="p-6 border-border/40 bg-gradient-to-br from-indigo-50 to-white">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-indigo-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Keep Going!</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;re {remaining} minutes away from your daily goal. 
              Discover new papers to stay on track.
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => router.push('/tinder')}
          className="w-full"
        >
          Continue Reading
        </Button>
      </div>
    </Card>
  );
}

