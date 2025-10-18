'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Paper } from '@/lib/types';
import { useStore } from '@/lib/store';
import { PaperCard } from './paper-card';
import { Button } from '@/components/ui/button';
import { DecisionModal } from './decision-modal';

interface SwipeDeckProps {
  papers: Paper[];
}

export function SwipeDeck({ papers }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalPaper, setModalPaper] = useState<Paper | null>(null);
  const swipe = useStore((state) => state.swipe);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const skipOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0]);
  const saveOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1]);

  const currentPaper = papers[currentIndex];

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        handleYes();
      } else {
        handleNo();
      }
    }
  };

  const handleNo = () => {
    if (!currentPaper) return;
    swipe(currentPaper.id, 'skip');
    setCurrentIndex((prev) => prev + 1);
    x.set(0);
  };

  const handleYes = () => {
    if (!currentPaper) return;
    setModalPaper(currentPaper);
  };

  const handleModalClose = () => {
    setModalPaper(null);
    setCurrentIndex((prev) => prev + 1);
    x.set(0);
  };

  if (!currentPaper) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-muted-foreground">
            No more papers to review
          </p>
          <p className="text-sm text-muted-foreground">
            Check back later for new recommendations
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-[600px] flex items-center justify-center">
        {/* Card stack effect - show next card behind */}
        {papers[currentIndex + 1] && (
          <div className="absolute inset-0 flex items-center justify-center scale-95 opacity-50">
            <div className="w-full max-w-2xl">
              <PaperCard paper={papers[currentIndex + 1]} mode="tinder" />
            </div>
          </div>
        )}

        {/* Current card */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: 'grabbing' }}
        >
          <div className="w-full max-w-2xl">
            <PaperCard paper={currentPaper} mode="tinder" />
          </div>
        </motion.div>

        {/* Swipe indicators */}
        <motion.div
          className="absolute left-8 top-1/2 -translate-y-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl font-bold text-2xl rotate-[-20deg] pointer-events-none"
          style={{ opacity: skipOpacity }}
        >
          SKIP
        </motion.div>
        <motion.div
          className="absolute right-8 top-1/2 -translate-y-1/2 bg-green-500 text-white px-6 py-3 rounded-2xl font-bold text-2xl rotate-[20deg] pointer-events-none"
          style={{ opacity: saveOpacity }}
        >
          SAVE
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 mt-8">
        <Button
          size="lg"
          variant="outline"
          className="w-16 h-16 rounded-full border-2 hover:bg-red-50 hover:border-red-500 hover:text-red-500"
          onClick={handleNo}
        >
          <X className="w-8 h-8" />
        </Button>
        
        <Button
          size="lg"
          className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
          onClick={handleYes}
        >
          <Check className="w-8 h-8" />
        </Button>
      </div>

      {/* Decision Modal */}
      <DecisionModal
        paper={modalPaper}
        open={!!modalPaper}
        onClose={handleModalClose}
      />
    </>
  );
}

