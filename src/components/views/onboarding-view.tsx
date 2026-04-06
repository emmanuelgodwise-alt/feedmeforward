'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Video,
  Type,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Star,
  Eye,
  Upload,
  Film,
  Lightbulb,
  Shield,
  Wallet,
  Camera,
  Mic,
  Clapperboard,
  MessageCircle,
  ArrowRight,
  GraduationCap,
  Crown,
  Target,
  Zap,
  Play,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingViewProps {
  onComplete: () => void;
  onNavigate: (view: string) => void;
}

const STEPS = [
  'welcome',
  'video_power',
  'influencer_path',
  'making_videos',
  'getting_paid',
  'ready',
] as const;

type Step = (typeof STEPS)[number];

export function OnboardingView({ onComplete, onNavigate }: OnboardingViewProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const stepIndex = STEPS.indexOf(currentStep);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = async (source?: 'top' | 'bottom') => {
    try {
      await fetch('/api/onboarding', { method: 'POST' });
      onComplete();
    } catch {
      onComplete(); // Continue regardless
    }
  };

  const handleNext = (source?: 'top' | 'bottom') => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1]);
      if (source === 'bottom') {
        setTimeout(scrollToTop, 50);
      }
    }
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
      setTimeout(scrollToTop, 50);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Progress bar + Top Continue button */}
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((step, idx) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx <= stepIndex
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => handleNext('top')}
              className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              Continue
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleComplete('top')}
              className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          {currentStep === 'welcome' && <WelcomeStep />}
          {currentStep === 'video_power' && <VideoPowerStep />}
          {currentStep === 'influencer_path' && <InfluencerPathStep />}
          {currentStep === 'making_videos' && <MakingVideosStep />}
          {currentStep === 'getting_paid' && <GettingPaidStep />}
          {currentStep === 'ready' && <ReadyStep />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="w-full max-w-2xl mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip for now
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button
              onClick={() => handleNext('bottom')}
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleComplete('bottom')}
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────
function WelcomeStep() {
  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20">
      <CardContent className="p-8 md:p-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-500/25 flex items-center justify-center mx-auto mb-6"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-extrabold mb-3">
          Welcome to <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">FeedMeForward</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
          Where every video starts a conversation. This quick guide will show you how to get the most out of your experience and unlock opportunities to earn.
        </p>

        {/* ── How It Works ────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-base font-bold mb-5 text-foreground/90">Here&apos;s How It Works</h2>

          {/* Lead Clip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-md mx-auto text-left mb-3"
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-orange-200 dark:border-orange-800/40 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Someone Posts a Lead Clip</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A user uploads a video — either their own or one they found — sharing a topic, asking a question, or seeking opinions on something that matters to them.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Arrow */}
          <div className="flex justify-center my-1">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-orange-500 rotate-90" />
            </div>
          </div>

          {/* Response Clip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto text-left mb-3"
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-amber-200 dark:border-amber-800/40 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0 shadow-sm">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">You Respond with Your Video</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You watch the clip and record your own video response sharing your thoughts, perspective, or answer — sparking a face-to-face dialogue.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Arrow */}
          <div className="flex justify-center my-1">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-orange-500 rotate-90" />
            </div>
          </div>

          {/* Conversation grows */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md mx-auto text-left mb-2"
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-card border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shrink-0 shadow-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">The Conversation Grows</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Others join in with their own video responses. The best responses rise to the top, earn you points and recognition, and can even lead to paid opportunities.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
          <MiniFeature icon={Video} title="Video Polls" desc="Share opinions face-to-face" color="orange" />
          <MiniFeature icon={Award} title="Get Scored" desc="Build your reputation" color="amber" />
          <MiniFeature icon={DollarSign} title="Earn Money" desc="Get paid for your voice" color="emerald" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 2: The Power of Video Responses ────────────────────────────
function VideoPowerStep() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Video Responses Are Everything</h2>
              <p className="text-sm text-muted-foreground">Why video is the heart of FeedMeForward</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 items-start p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Face-to-Face Builds Trust</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When people see your face and hear your voice, your opinion carries 10x more weight than a text comment.
                  Businesses and creators specifically look for members who show their faces — it signals authenticity and credibility.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Video Responses Earn 6x More Points</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our scoring system heavily rewards video responses over text. A single video response earns 6 points
                  toward your engagement score vs. just 1 point for a text-only response. Higher scores mean verified status,
                  better visibility, and eligibility for paid opportunities.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Responses That Get Engagement Boost Your Quality Score</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When your video response receives likes and comments, your quality score increases significantly.
                  Add detailed descriptions to your responses for an additional bonus. This quality signal is what
                  businesses look for when selecting participants for paid polls.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Type className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Text-only responses are still allowed</p>
            <p className="text-xs text-muted-foreground">They earn fewer points and show as &ldquo;This Is A Text-Only Response&rdquo; in the video box.</p>
          </div>
          <Badge variant="secondary" className="text-xs">Secondary</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 3: The Influencer Path ─────────────────────────────────────
function InfluencerPathStep() {
  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">The Influencer Path</h2>
            <p className="text-sm text-muted-foreground">How video responses unlock paid opportunities</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Companies and individuals actively search for verified members with strong video response records to participate
          in paid polls. Here is how you climb the ladder:
        </p>

        {/* Score tiers */}
        <div className="space-y-3">
          <TierBadge tier="Bronze" score="0-199" desc="Starting point. Focus on creating your first video responses." color="orange" />
          <TierBadge tier="Silver" score="200-499" desc="Gaining traction. Your video responses are receiving engagement." color="gray" />
          <TierBadge tier="Gold" score="500-749" desc="Verified member! Eligible for paid poll invitations." color="amber" icon={Shield} />
          <TierBadge tier="Diamond" score="750-899" desc="Top-tier influencer. Highly sought after by businesses." color="cyan" icon={Award} />
          <TierBadge tier="Elite" score="900-1000" desc="The best of the best. Maximum visibility and highest earning potential." color="rose" icon={Sparkles} />
        </div>

        <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Influencer Score = Video Ratio + Response Quality + Engagement</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your influencer score (0-100) measures your potential for paid opportunities. It is calculated from your video
                  response ratio, the quality of engagement your responses receive, and your overall activity level. Businesses can
                  filter participants by this score when creating paid polls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Getting Invited to Paid Polls</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Businesses browse verified members, review their video response history, and invite top performers to participate
                  in paid polls. Participants earn money directly into their FeedMeForward wallet for each poll completed.
                  Earnings can be withdrawn to your personal bank account at any time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Making Great Videos ─────────────────────────────────────
function MakingVideosStep() {
  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Making Great Response Videos</h2>
            <p className="text-sm text-muted-foreground">Practical tips to create compelling video responses</p>
          </div>
        </div>

        {/* Tips grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TipCard
            icon={Camera}
            title="Good Lighting Matters"
            desc="Face a window or light source. Natural light makes you look professional and trustworthy. Avoid harsh backlighting."
          />
          <TipCard
            icon={Mic}
            title="Clear Audio is Key"
            desc="Speak clearly and at a moderate pace. Find a quiet environment. Good audio is often more important than perfect video quality."
          />
          <TipCard
            icon={Play}
            title="Keep It Focused"
            desc="Aim for 30 seconds to 2 minutes. State your opinion clearly, support it with reasoning, and conclude. Brevity wins."
          />
          <TipCard
            icon={Lightbulb}
            title="Be Authentic"
            desc="Show your real personality. Businesses value genuine, thoughtful opinions over scripted responses. Your unique perspective is your strength."
          />
        </div>

        {/* Auto-format info */}
        <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Automatic Video Formatting</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When you upload a video, our system automatically processes it to conform with our platform&apos;s standard format.
                  Supported formats include MP4, WebM, MOV, and AVI up to 100MB. Your video will be optimized for the best
                  viewing experience across all devices. Just upload and we handle the rest.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tutorial links */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-orange-500" />
            Video Creation Tutorials
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TutorialLink
              title="Getting Started with Video Responses"
              category="Beginner"
              duration="5 min read"
            />
            <TutorialLink
              title="Lighting & Audio on a Budget"
              category="Production"
              duration="8 min read"
            />
            <TutorialLink
              title="Editing Tips for Quick Responses"
              category="Editing"
              duration="6 min read"
            />
            <TutorialLink
              title="Building Your Influencer Profile"
              category="Strategy"
              duration="10 min read"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 5: Getting Paid ────────────────────────────────────────────
function GettingPaidStep() {
  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Getting Paid</h2>
            <p className="text-sm text-muted-foreground">How the payment system works</p>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="space-y-3">
          <FlowStep
            number="1"
            title="Companies Create Paid Polls"
            desc="Businesses and individuals create opinion polls and fund them through their FeedMeForward wallet. They set the reward per response."
            color="emerald"
          />
          <FlowStep
            number="2"
            title="You Get Invited or Find Paid Polls"
            desc="As a verified member with strong video responses, you will be invited to paid polls. You can also browse paid polls in the Video Polls feed."
            color="blue"
          />
          <FlowStep
            number="3"
            title="You Respond with Video"
            desc="Record your video response sharing your opinion. Video responses are prioritized by poll creators for their authenticity."
            color="orange"
          />
          <FlowStep
            number="4"
            title="Claim Your Reward"
            desc="After completing the poll, your reward is automatically added to your FeedMeForward wallet. Just click &ldquo;Claim Reward&rdquo;."
            color="amber"
          />
          <FlowStep
            number="5"
            title="Withdraw to Your Account"
            desc="Withdraw your earnings at any time to your personal bank account. Minimum withdrawal is $10."
            color="purple"
          />
        </div>

        <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">How Much Can You Earn?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Earnings vary per poll. Some polls pay $0.50 per response while others pay $5 or more. Active members who consistently
                  provide quality video responses and maintain Gold or Diamond status can earn significant income through regular
                  participation. The more polls you qualify for, the more you earn.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

// ─── Step 6: Ready ──────────────────────────────────────────────────
function ReadyStep() {
  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/30">
      <CardContent className="p-8 md:p-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-500/25 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-3xl font-extrabold mb-3">You&apos;re Ready!</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
          You now know everything you need to get started. Remember: video responses are your superpower on FeedMeForward.
          Every video you create builds your reputation and opens doors to paid opportunities.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-8">
          <ActionCard
            icon={Video}
            title="Browse Video Polls"
            desc="Find polls that interest you"
            actionLabel="Explore"
            onClick={() => {}}
          />
          <ActionCard
            icon={Upload}
            title="Create Your First Lead"
            desc="Start a conversation"
            actionLabel="Create"
            onClick={() => {}}
          />
          <ActionCard
            icon={Users}
            title="View Your Profile"
            desc="Track your score and progress"
            actionLabel="Profile"
            onClick={() => {}}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper Components ───────────────────────────────────────────────

function MiniFeature({ icon: Icon, title, desc, color }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    orange: 'from-orange-400 to-orange-500',
    amber: 'from-amber-400 to-amber-500',
    emerald: 'from-emerald-400 to-emerald-500',
  };
  return (
    <div className="text-center">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color] || colors.orange} flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function TierBadge({ tier, score, desc, color, icon: Icon }: { tier: string; score: string; desc: string; color: string; icon?: React.ComponentType<{ className?: string }> }) {
  const gradients: Record<string, string> = {
    orange: 'from-orange-400 to-amber-500',
    gray: 'from-gray-400 to-gray-500',
    amber: 'from-amber-400 to-yellow-500',
    cyan: 'from-cyan-400 to-purple-500',
    rose: 'from-rose-400 to-amber-400',
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradients[color] || gradients.orange} flex items-center justify-center shrink-0`}>
        {Icon ? <Icon className="w-5 h-5 text-white" /> : <span className="text-white text-xs font-bold">{tier[0]}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">{tier}</p>
          <Badge variant="secondary" className="text-[10px]">{score}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function TipCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-orange-500" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function TutorialLink({ title, category, duration }: { title: string; category: string; duration: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/30 transition-colors cursor-pointer">
      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
        <Clapperboard className="w-4 h-4 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground">{category} · {duration}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
}

function FlowStep({ number, title, desc, color }: { number: string; title: string; desc: string; color: string }) {
  const bgColors: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card border">
      <div className={`w-7 h-7 rounded-full ${bgColors[color] || bgColors.blue} flex items-center justify-center shrink-0 text-xs font-bold`}>
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, actionLabel }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; actionLabel: string; onClick: () => void }) {
  return (
    <div className="p-4 rounded-xl border bg-card text-center space-y-2">
      <Icon className="w-6 h-6 text-orange-500 mx-auto" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <Badge variant="secondary" className="text-xs">{actionLabel}</Badge>
    </div>
  );
}
