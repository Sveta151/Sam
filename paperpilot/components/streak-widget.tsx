'use client';

import { Flame } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';

interface StreakWidgetProps {
  variant?: 'compact' | 'full';
}

export function StreakWidget({ variant = 'full' }: StreakWidgetProps) {
  const reads = useStore((state) => state.reads);
  
  const streak = useMemo(() => {
    const dates = [...new Set(reads.map((r) => r.dateISO))].sort().reverse();
    
    if (dates.length === 0) return 0;

    let streakCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (dates.includes(checkDateStr)) {
        streakCount++;
      } else {
        break;
      }
    }

    return streakCount;
  }, [reads]);
  
  const todayMinutes = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayReads = reads.filter((r) => r.dateISO === today);
    const totalSeconds = todayReads.reduce((sum, r) => sum + r.secondsActive, 0);
    return Math.floor(totalSeconds / 60);
  }, [reads]);
  
  const dailyGoal = 30; // 30 minutes daily goal
  const progress = Math.min((todayMinutes / dailyGoal) * 100, 100);

  if (variant === 'compact') {
    return (
      <Card className="p-4 border-border/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Flame className="w-8 h-8 text-orange-500" fill="currentColor" />
            <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {streak}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{todayMinutes} min today</p>
            <Progress value={progress} className="h-1.5 mt-1" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border/40">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-10 h-10 text-orange-500" fill="currentColor" />
            <div>
              <h3 className="text-2xl font-bold">{streak}</h3>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today&apos;s Progress</span>
            <span className="font-medium">{todayMinutes} / {dailyGoal} min</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {progress >= 100 && (
          <p className="text-sm text-green-600 font-medium">
            🎉 Goal achieved today!
          </p>
        )}
      </div>
    </Card>
  );
}

