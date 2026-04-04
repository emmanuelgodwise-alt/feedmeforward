'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, DollarSign, Users, ChevronDown } from 'lucide-react';
import type { Poll } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { useToast } from '@/hooks/use-toast';

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const { currentUser } = useAuthStore();
  const { votePoll } = useVideoStore();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
  const isClosed = poll.closesAt && new Date(poll.closesAt) < new Date();

  const handleVote = async (optionId: string) => {
    if (!currentUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to vote on polls', variant: 'destructive' });
      return;
    }
    if (poll.userVoted || isClosed) return;

    setIsVoting(true);
    await votePoll(poll.id, optionId);
    setIsVoting(false);
  };

  const getPercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  return (
    <Card className="border-orange-100 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">{poll.question}</CardTitle>
          <div className="flex gap-1.5 shrink-0">
            {poll.isPaid && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                <DollarSign className="w-3 h-3 mr-0.5" />
                Paid
              </Badge>
            )}
            {isClosed && (
              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 text-xs">
                <Clock className="w-3 h-3 mr-0.5" />
                Closed
              </Badge>
            )}
          </div>
        </div>
        {poll.isPaid && poll.rewardPerResponse && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Earn ${poll.rewardPerResponse.toFixed(2)} per response
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence mode="wait">
          {/* Show results if user voted or poll is closed */}
          {poll.userVoted || isClosed ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {poll.options.map((option) => {
                const pct = getPercentage(option.voteCount);
                const isWinner = poll.options.every((o) => o.voteCount <= option.voteCount) && option.voteCount > 0;
                return (
                  <div key={option.id} className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    <div
                      className={`relative flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm ${
                        option.id === poll.userVoteOptionId
                          ? 'border-orange-300 dark:border-orange-700 font-medium'
                          : isWinner
                          ? 'border-amber-300 dark:border-amber-700'
                          : 'border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {option.id === poll.userVoteOptionId && (
                          <Check className="w-4 h-4 text-orange-500" />
                        )}
                        {option.text}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        {pct}% ({option.voteCount})
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {poll.options.map((option) => (
                <motion.div
                  key={option.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2.5 px-4 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                    disabled={isVoting}
                    onClick={() => handleVote(option.id)}
                  >
                    <span className="text-sm">{option.text}</span>
                  </Button>
                </motion.div>
              ))}
              {!currentUser && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Sign in to vote on this poll
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Poll meta */}
        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {poll.responseCount} {poll.responseCount === 1 ? 'vote' : 'votes'}
          </span>
          {poll.closesAt && !isClosed && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Closes {new Date(poll.closesAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
