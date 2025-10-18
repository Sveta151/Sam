'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, FileText, Sparkles, Video, Loader2 } from 'lucide-react';
// import { useSupabaseUploads } from '@/lib/hooks/useSupabaseUploads'; // TODO: Uncomment when integrating paperbrain
import { toast } from 'sonner';

interface ActionTilesProps {
  disabled?: boolean;
  paperId?: string;
}

export function ActionTiles({ disabled = false, paperId }: ActionTilesProps) {
  // const { saveGeneratedAsset } = useSupabaseUploads(); // TODO: Uncomment when integrating paperbrain
  const [loading, setLoading] = useState<string | null>(null);

  const handleGeneratePodcast = async () => {
    if (!paperId) {
      toast.error('No paper selected');
      return;
    }

    setLoading('podcast');
    try {
      // TODO: Call paperbrain API to generate podcast
      // For now, simulate with a mock URL
      toast.info('Generating podcast... (calling paperbrain API)');
      
      // Example: const response = await fetch(`http://localhost:3001/api/v1/podcast/${paperId}`);
      // const data = await response.json();
      // const audioUrl = data.audioUrl;
      
      // Mock for demonstration:
      // await saveGeneratedAsset({
      //   paperId,
      //   url: audioUrl,
      //   kind: 'audio',
      // });
      
      toast.success('Podcast generation started! (integrate paperbrain API)');
    } catch (error) {
      console.error('Podcast generation error:', error);
      toast.error('Failed to generate podcast');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!paperId) {
      toast.error('No paper selected');
      return;
    }

    setLoading('video');
    try {
      // TODO: Call paperbrain API to generate video
      toast.info('Generating video... (calling paperbrain API)');
      
      // Example: const response = await fetch(`http://localhost:3001/api/v1/video/${paperId}`);
      // const data = await response.json();
      // const videoUrl = data.videoUrl;
      
      // await saveGeneratedAsset({
      //   paperId,
      //   url: videoUrl,
      //   kind: 'video',
      // });
      
      toast.success('Video generation started! (integrate paperbrain API)');
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Failed to generate video');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!paperId) {
      toast.error('No paper selected');
      return;
    }

    setLoading('summary');
    try {
      // TODO: Call paperbrain API to generate summary
      toast.info('Generating summary... (calling paperbrain API)');
      
      // Example: const response = await fetch(`http://localhost:3001/api/v1/synthesis/${paperId}`);
      // const data = await response.json();
      // const summaryUrl = data.jsonUrl;
      
      // await saveGeneratedAsset({
      //   paperId,
      //   url: summaryUrl,
      //   kind: 'json',
      // });
      
      toast.success('Summary generation started! (integrate paperbrain API)');
    } catch (error) {
      console.error('Summary generation error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(null);
    }
  };

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
          <Button 
            size="sm" 
            disabled={disabled || loading === 'summary'}
            onClick={handleGenerateSummary}
          >
            {loading === 'summary' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Generate'
            )}
          </Button>
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
          <Button 
            size="sm" 
            disabled={disabled || loading === 'podcast'}
            onClick={handleGeneratePodcast}
          >
            {loading === 'podcast' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create'
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Video</div>
              <div className="text-xs text-muted-foreground">Make summary video</div>
            </div>
          </div>
          <Button 
            size="sm" 
            disabled={disabled || loading === 'video'}
            onClick={handleGenerateVideo}
          >
            {loading === 'video' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create'
            )}
          </Button>
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


