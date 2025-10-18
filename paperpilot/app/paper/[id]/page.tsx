'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Users, Calendar, Quote } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatPanel } from '@/components/chat-panel';
import { ActionTiles } from '@/components/action-tiles';

export default function PaperReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const papers = useStore((state) => state.papers);
  const markReadProgress = useStore((state) => state.markReadProgress);
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const paper = papers.find((p) => p.id === id);

  useEffect(() => {
    // Track time spent on page
    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Save progress every 5 seconds
    const saveInterval = setInterval(() => {
      if (paper && (timeSpent > 0 || scrollProgress > 0)) {
        markReadProgress(paper.id, 5, scrollProgress);
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [paper, timeSpent, scrollProgress, markReadProgress]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(Math.min(Math.max(progress, 0), 100));
  };

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Paper not found</p>
      </div>
    );
  }

  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="font-semibold text-sm line-clamp-1">
                    {paper.title}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-secondary"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - scrollProgress / 100)}`}
                    className="text-primary transition-all"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {Math.round(scrollProgress)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid with right panel */}
      <div className="content-grid gap-6 px-6 py-8">
        {/* Reader column */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="col-span-8 h-[calc(100vh-120px)] overflow-y-auto"
        >
          <Card className="p-8 border-border/40">
          {/* Paper Header */}
          <div className="space-y-6 mb-8">
            <h1 className="text-3xl font-bold leading-tight">
              {paper.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {paper.authors && paper.authors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{paper.authors.join(', ')}</span>
                </div>
              )}
              
              {paper.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{paper.year}</span>
                </div>
              )}
              
              {paper.citations !== undefined && (
                <div className="flex items-center gap-2">
                  <Quote className="w-4 h-4" />
                  <span>{paper.citations} citations</span>
                </div>
              )}
            </div>

            {paper.venue && (
              <div className="inline-block px-3 py-1.5 bg-secondary rounded-lg text-sm font-medium">
                {paper.venue}
              </div>
            )}

            {paper.labels && paper.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {paper.labels.map((label, idx) => (
                  <Badge key={idx} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Abstract/Summary */}
          {paper.summary2 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Abstract</h2>
              <p className="text-foreground/90 leading-relaxed">
                {paper.summary2}
              </p>
            </div>
          )}

          {/* Preview */}
          {paper.fileUrl || paper.fileDataUrl ? (() => {
            const displayUrl = paper.fileDataUrl || paper.fileUrl; // prefer persistent data URL when present
            const lowerName = (paper.originalFileName || '').toLowerCase();
            const isPdf = (paper.mimeType && paper.mimeType.includes('pdf')) || lowerName.endsWith('.pdf');
            const isImage = (paper.mimeType && paper.mimeType.startsWith('image/')) ||
              ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) => lowerName.endsWith(ext));
            return (
              <div className="rounded-xl overflow-hidden border">
                {isPdf ? (
                  <iframe
                    src={displayUrl || ''}
                    className="w-full h-[70vh] bg-white"
                    title={paper.title}
                  />
                ) : isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayUrl || ''} alt={paper.title} className="w-full h-auto" />
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-secondary/20">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Preview not available</h3>
                    <p className="text-sm text-muted-foreground">
                      {paper.originalFileName || 'Unknown file'}
                    </p>
                    {displayUrl && (
                      <p className="text-xs mt-3">
                        <a href={displayUrl} target="_blank" rel="noreferrer" className="underline">Open file in new tab</a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-secondary/20">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">PDF Reader Placeholder</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Full PDF rendering will be implemented here
              </p>
              <p className="text-xs text-muted-foreground">
                Scroll to simulate reading progress
              </p>
            </div>
          )}

          {/* Dummy content for scrolling */}
          <div className="mt-8 space-y-4 text-muted-foreground">
            {Array.from({ length: 10 }).map((_, i) => (
              <p key={i} className="leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            ))}
          </div>
          </Card>
        </div>

        {/* Right panel: chat + actions */}
        <div className="col-span-4 space-y-4 h-[calc(100vh-120px)]">
          <div className="h-2/3">
            <ChatPanel />
          </div>
          <div className="h-1/3">
            <ActionTiles />
          </div>
        </div>
      </div>
    </div>
  );
}

