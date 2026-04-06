'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { Vote } from 'lucide-react';

interface LivePoll {
  id: string;
  question: string;
  options: Array<{ text: string; voteCount: number }>;
  totalVotes: number;
  status: string;
}

interface LivePollPanelProps {
  sessionId: string;
  isCreator?: boolean;
}

export function LivePollPanel({ sessionId, isCreator }: LivePollPanelProps) {
  const { currentUser } = useAuthStore();
  const [polls, setPolls] = useState<LivePoll[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [voting, setVoting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);

  // Fetch initial polls
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/stream`);
        const data = await res.json();
        if (data.success && data.activePolls) {
          setPolls(data.activePolls.map((p: { id: string; question: string; options: string; totalVotes: number; status: string }) => ({
            ...p,
            options: JSON.parse(p.options),
          })));
        }
      } catch {
        // ignore
      }
    };
    fetchPolls();
  }, [sessionId]);

  // Set up SSE for poll updates
  useEffect(() => {
    if (!currentUser) return;

    const eventSource = new EventSource(
      `/api/live/sessions/${sessionId}/sse?userId=${currentUser.id}`
    );

    eventSource.addEventListener('poll_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        setPolls(prev => prev.map(p => {
          if (p.id === data.pollId) {
            return { ...p, options: data.options, totalVotes: data.totalVotes };
          }
          return p;
        }));
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('new_poll', (e) => {
      try {
        const data = JSON.parse(e.data);
        const newPoll: LivePoll = {
          id: data.id,
          question: data.question,
          options: data.options.map((text: string, i: number) => ({ text, voteCount: i === 0 ? 1 : 0 })),
          totalVotes: data.totalVotes || 0,
          status: 'active',
        };
        setPolls(prev => [newPoll, ...prev]);
      } catch {
        // ignore
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId, currentUser]);

  const handleVote = useCallback(async (pollId: string, optionIndex: number) => {
    if (!currentUser || voting) return;
    setVoting(pollId);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ optionIndex }),
      });
      const data = await res.json();
      if (data.success) {
        setUserVotes(prev => ({ ...prev, [pollId]: optionIndex }));
      }
    } catch {
      // ignore
    } finally {
      setVoting(null);
    }
  }, [currentUser, sessionId, voting]);

  const handleCreatePoll = async () => {
    if (!currentUser || !newQuestion.trim()) return;
    const validOptions = newOptions.filter(o => o.trim().length > 0);
    if (validOptions.length < 2) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({
          question: newQuestion.trim(),
          options: validOptions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewQuestion('');
        setNewOptions(['', '']);
        setShowCreate(false);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  if (polls.length === 0 && !isCreator) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Polls */}
      {polls.map(poll => {
        const totalVotes = poll.totalVotes || 1;
        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5 text-orange-500" />
                {poll.question}
              </h4>
              <Badge variant="secondary" className="text-[10px]">
                {poll.totalVotes} votes
              </Badge>
            </div>
            <div className="space-y-2">
              {poll.options.map((option, idx) => {
                const percentage = Math.round((option.voteCount / totalVotes) * 100);
                const isSelected = userVotes[poll.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleVote(poll.id, idx)}
                    disabled={voting === poll.id || !currentUser}
                    className={`w-full text-left relative rounded-lg border overflow-hidden transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500/20 to-amber-500/10"
                      initial={{ width: '0%' }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-medium">{option.text}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Create Poll (creator only) */}
      {isCreator && currentUser && (
        <div>
          {!showCreate ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
              className="w-full gap-2 text-xs"
            >
              <Vote className="w-3 h-3" />
              Create Poll
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white dark:bg-gray-800 rounded-lg border p-3 space-y-2"
            >
              <Input
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="text-xs h-8"
                maxLength={200}
              />
              {newOptions.map((opt, idx) => (
                <Input
                  key={idx}
                  value={opt}
                  onChange={e => {
                    const next = [...newOptions];
                    next[idx] = e.target.value;
                    setNewOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="text-xs h-8"
                  maxLength={100}
                />
              ))}
              {newOptions.length < 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewOptions([...newOptions, ''])}
                  className="text-[10px] h-6"
                >
                  + Add option
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreatePoll}
                  disabled={creating || !newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2}
                  className="flex-1 h-7 text-xs bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowCreate(false); setNewQuestion(''); setNewOptions(['', '']); }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
