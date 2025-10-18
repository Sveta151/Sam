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

export function ChatPanel({ title = 'Chat about this paper' }: { title?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask me to summarize, explain, or quiz you on this paper.',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    // Mock assistant reply
    const reply: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Thanks! This will connect to summarization soon. For now, consider key contributions and limitations.',
    };
    setTimeout(() => setMessages((prev) => [...prev, reply]), 400);
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
        <Button onClick={send}>Send</Button>
      </div>
    </Card>
  );
}


