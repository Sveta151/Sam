'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ title = 'Chat about this paper', paperId }: { title?: string; paperId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask me to summarize, explain, or quiz you on this paper.',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setIsSending(true);
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    try {
      if (!paperId) {
        const reply: Message = { id: crypto.randomUUID(), role: 'assistant', content: 'Paper not ingested yet. Please retry once ingest completes.' };
        setMessages((prev) => [...prev, reply]);
        setIsSending(false);
        return;
      }
      const res = await fetch('http://localhost:8787/v1/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          paperId,
          messages: [{ role: 'user', content: trimmed }],
          topK: 8,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Chat failed');
      }
      const json = await res.json();
      const answer: string = json?.answer || 'No answer.';
      const reply: Message = { id: crypto.randomUUID(), role: 'assistant', content: answer };
      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      const reply: Message = { id: crypto.randomUUID(), role: 'assistant', content: String(err?.message || err) };
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-4 border-border/40 h-full flex flex-col">
      <div className="mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <Separator className="my-2" />
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[80%] bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm'
                : 'mr-auto max-w-[85%] bg-secondary rounded-lg px-3 py-2 text-sm'
            }
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Input
          placeholder="Type a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
        />
        <Button onClick={send} disabled={isSending}>{isSending ? 'Sending...' : 'Send'}</Button>
      </div>
    </Card>
  );
}


