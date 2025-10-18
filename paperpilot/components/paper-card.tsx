'use client';

import { useRouter } from 'next/navigation';
import { FileText, Users, Calendar, Quote } from 'lucide-react';
import { Paper } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface PaperCardProps {
  paper: Paper;
  mode?: 'compact' | 'tinder';
  onClick?: () => void;
}

export function PaperCard({ paper, mode = 'compact', onClick }: PaperCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/paper/${paper.id}`);
    }
  };

  if (mode === 'tinder') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="p-8 border-border/40 shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-white"
          onClick={handleClick}
        >
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold leading-tight mb-3">
                  {paper.title}
                </h2>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {paper.authors && paper.authors.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{paper.authors.slice(0, 3).join(', ')}</span>
                      {paper.authors.length > 3 && <span>et al.</span>}
                    </div>
                  )}
                  
                  {paper.year && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{paper.year}</span>
                    </div>
                  )}
                  
                  {paper.citations !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Quote className="w-4 h-4" />
                      <span>{paper.citations} citations</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Venue */}
            {paper.venue && (
              <div className="px-3 py-1.5 bg-secondary rounded-lg text-sm font-medium inline-block self-start">
                {paper.venue}
              </div>
            )}

            {/* Summary */}
            {paper.summary2 && (
              <p className="text-base leading-relaxed text-foreground/90">
                {paper.summary2}
              </p>
            )}

            {/* Labels */}
            {paper.labels && paper.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {paper.labels.map((label, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // Compact mode
  return (
    <Card 
      className="p-4 border-border/40 hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={handleClick}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-tight mb-1.5 line-clamp-2">
              {paper.title}
            </h3>
            
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {paper.authors && paper.authors.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {paper.authors[0]}
                  {paper.authors.length > 1 && ' et al.'}
                </span>
              )}
              
              {paper.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {paper.year}
                </span>
              )}
              
              {paper.venue && (
                <span className="font-medium text-primary">
                  {paper.venue}
                </span>
              )}
            </div>
          </div>
        </div>

        {paper.summary2 && (
          <p className="text-sm text-muted-foreground line-clamp-2 pl-8">
            {paper.summary2}
          </p>
        )}

        {paper.labels && paper.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8">
            {paper.labels.slice(0, 4).map((label, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

