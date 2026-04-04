'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Heart,
  Star,
  TrendingUp,
  Clock,
  Send,
  Plus,
  DollarSign,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useToast } from '@/hooks/use-toast';
import { TipDialog } from '@/components/tip-dialog';
import { QuickNav } from '@/components/quick-nav';
import type { View } from '@/app/page';
import type { TransactionItem } from '@/types';

interface WalletViewProps {
  onNavigate: (view: View, state?: Record<string, unknown>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '+';
  return `${sign}$${abs.toFixed(2)}`;
}

const TX_TYPE_CONFIG: Record<string, { icon: typeof ArrowDownCircle; color: string; bgColor: string; label: string }> = {
  deposit: { icon: ArrowDownCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/50', label: 'Deposit' },
  withdrawal: { icon: ArrowUpCircle, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/50', label: 'Withdrawal' },
  tip: { icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-950/50', label: 'Tip' },
  earning: { icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/50', label: 'Earning' },
  reward: { icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/50', label: 'Reward' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const FILTER_TABS = ['all', 'deposits', 'withdrawals', 'tips', 'earnings', 'rewards'] as const;

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function WalletView({ onNavigate }: WalletViewProps) {
  const { currentUser, updateWalletBalance } = useAuthStore();
  const { summary, transactions, totalTransactions, isLoading, isTransactionsLoading, fetchSummary, fetchTransactions } = useWalletStore();
  const { toast } = useToast();

  // Deposit state
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const depositPresets = [5, 10, 25, 50, 100];

  // Withdraw state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

  // Tip state
  const [tipOpen, setTipOpen] = useState(false);
  const [tipRecipientId, setTipRecipientId] = useState('');
  const [tipRecipientUsername, setTipRecipientUsername] = useState('');

  // Transaction filter
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  const balance = currentUser?.walletBalance ?? summary?.balance ?? 0;

  // Fetch data on mount
  useEffect(() => {
    if (currentUser) {
      fetchSummary(currentUser.id);
      fetchTransactions(currentUser.id, 'all', 20, 0);
    }
  }, [currentUser, fetchSummary, fetchTransactions]);

  // Refetch when filter changes
  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setOffset(0);
    if (currentUser) {
      fetchTransactions(currentUser.id, filter, 20, 0);
    }
  }, [currentUser, fetchTransactions]);

  const handleLoadMore = useCallback(() => {
    const newOffset = offset + 20;
    setOffset(newOffset);
    if (currentUser) {
      fetchTransactions(currentUser.id, activeFilter, 20, newOffset, true);
    }
  }, [currentUser, activeFilter, offset, fetchTransactions]);

  // ─── Deposit ────────────────────────────────────────────────────
  const handleDepositPreset = (amount: number) => {
    setDepositAmount(String(amount));
    setSelectedPreset(amount);
  };

  const handleDepositCustom = (value: string) => {
    setDepositAmount(value);
    setSelectedPreset(null);
  };

  const handleDeposit = async () => {
    const num = parseFloat(depositAmount);
    if (!num || num <= 0 || num > 10000 || !currentUser) return;

    setDepositLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({ amount: num }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Deposit failed', description: data.error || 'Could not process deposit', variant: 'destructive' });
        return;
      }
      updateWalletBalance(data.newBalance);
      fetchSummary(currentUser.id);
      fetchTransactions(currentUser.id, activeFilter, 20, 0);
      toast({ title: 'Deposit successful! 🎉', description: `$${num.toFixed(2)} has been added to your wallet.` });
      setDepositAmount('');
      setSelectedPreset(null);
      setDepositOpen(false);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setDepositLoading(false);
    }
  };

  // ─── Withdraw ───────────────────────────────────────────────────
  const handleWithdraw = async () => {
    const num = parseFloat(withdrawAmount);
    if (!num || num < 10 || num > balance || !currentUser) return;

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({ amount: num }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Withdrawal failed', description: data.error || 'Could not process withdrawal', variant: 'destructive' });
        return;
      }
      updateWalletBalance(data.newBalance);
      fetchSummary(currentUser.id);
      fetchTransactions(currentUser.id, activeFilter, 20, 0);
      toast({ title: 'Withdrawal processed! 💸', description: `$${num.toFixed(2)} has been withdrawn.` });
      setWithdrawAmount('');
      setWithdrawOpen(false);
      setWithdrawConfirmOpen(false);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleWithdrawClick = () => {
    const num = parseFloat(withdrawAmount);
    if (!num || num < 10 || num > balance) return;
    setWithdrawConfirmOpen(true);
  };

  // ─── Tip from wallet ────────────────────────────────────────────
  const handleOpenTip = () => {
    setTipRecipientUsername('');
    setTipRecipientId('');
    setTipOpen(true);
  };

  const handleTipSuccess = () => {
    if (currentUser) {
      fetchSummary(currentUser.id);
      fetchTransactions(currentUser.id, activeFilter, 20, 0);
    }
  };

  const depositNum = parseFloat(depositAmount) || 0;
  const withdrawNum = parseFloat(withdrawAmount) || 0;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0 gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-500" />
            Wallet
          </h1>
          <p className="text-sm text-muted-foreground">Manage your funds, tips, and earnings</p>
        </div>
      </motion.div>

      <QuickNav onNavigate={(v) => onNavigate(v as View)} activeView="wallet" />

      {/* Wallet Header Card */}
      <motion.div variants={staggerItem} initial="initial" animate="animate">
        <Card className="mb-6 bg-gradient-to-br from-orange-500 to-amber-600 border-0 shadow-lg shadow-orange-500/20 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-sm font-medium text-orange-100 mb-1">Available Balance</p>
            {isLoading ? (
              <Skeleton className="h-12 w-48 mx-auto bg-orange-400/30" />
            ) : (
              <p className="text-4xl font-bold tracking-tight">
                ${balance.toFixed(2)}
              </p>
            )}
            <p className="text-xs text-orange-200 mt-1">FeedMeForward Wallet</p>
            <Separator className="my-4 bg-orange-400/30" />
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                onClick={() => setDepositOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Deposit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                onClick={() => setWithdrawOpen(true)}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Withdraw
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                onClick={handleOpenTip}
              >
                <Send className="w-4 h-4" />
                Send Tip
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6"
      >
        {[
          { icon: TrendingUp, label: 'Total Earnings', value: summary?.totalEarnings ?? 0, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/50', isPositive: true },
          { icon: Heart, label: 'Total Tips Sent', value: summary?.totalTipsSent ?? 0, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-950/50', isPositive: false },
          { icon: ArrowDownCircle, label: 'Total Deposits', value: summary?.totalDeposits ?? 0, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/50', isPositive: true },
          { icon: ArrowUpCircle, label: 'Total Withdrawals', value: summary?.totalWithdrawals ?? 0, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/50', isPositive: false },
          { icon: Clock, label: 'Pending', value: summary?.pendingAmount ?? 0, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/50', isPositive: true },
          { icon: Receipt, label: 'Transactions', value: totalTransactions, color: 'text-muted-foreground', bgColor: 'bg-muted', isPositive: true, isCount: true },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.bgColor} border-0 shadow-sm`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className={`text-sm font-bold ${stat.isPositive ? 'text-emerald-600 dark:text-emerald-400' : stat.isCount ? '' : 'text-red-500'}`}>
                  {stat.isCount
                    ? stat.value.toLocaleString()
                    : `${stat.isPositive && stat.value > 0 ? '+' : ''}$${stat.value.toFixed(2)}`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Transaction History */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {FILTER_TABS.map((tab) => (
                <Button
                  key={tab}
                  variant={activeFilter === tab ? 'default' : 'outline'}
                  size="sm"
                  className={
                    activeFilter === tab
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm text-xs shrink-0'
                      : 'text-xs shrink-0'
                  }
                  onClick={() => handleFilterChange(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
            </div>

            {/* Transaction list */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {isLoading && transactions.length === 0 ? (
                // Skeleton loading
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : transactions.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="w-12 h-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Deposits, tips, and earnings will appear here</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))
              )}
            </div>

            {/* Load more */}
            {transactions.length > 0 && transactions.length < totalTransactions && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isTransactionsLoading}
                  className="gap-2"
                >
                  {isTransactionsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${totalTransactions - transactions.length} remaining)`
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Deposit Dialog ──────────────────────────────────────────── */}
      <Dialog open={depositOpen} onOpenChange={(open) => {
        if (!open) { setDepositAmount(''); setSelectedPreset(null); }
        setDepositOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Deposit Funds
            </DialogTitle>
            <DialogDescription>Add money to your FeedMeForward wallet</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Presets */}
            <div className="flex gap-2 flex-wrap">
              {depositPresets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={selectedPreset === preset ? 'default' : 'outline'}
                  size="sm"
                  className={
                    selectedPreset === preset
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm rounded-full px-4'
                      : 'rounded-full px-4 hover:border-emerald-300'
                  }
                  onClick={() => handleDepositPreset(preset)}
                >
                  ${preset}
                </Button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="deposit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => handleDepositCustom(e.target.value)}
                  className="pl-8"
                />
              </div>
              {depositNum > 10000 && (
                <p className="text-xs text-destructive">Maximum deposit is $10,000</p>
              )}
            </div>

            {/* Current balance */}
            <div className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">${balance.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDepositOpen(false); setDepositAmount(''); setSelectedPreset(null); }}>Cancel</Button>
            <Button
              onClick={handleDeposit}
              disabled={!depositNum || depositNum <= 0 || depositNum > 10000 || depositLoading}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
            >
              {depositLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Plus className="w-4 h-4" /> Deposit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Withdraw Dialog ─────────────────────────────────────────── */}
      <Dialog open={withdrawOpen} onOpenChange={(open) => {
        if (!open) { setWithdrawAmount(''); setWithdrawConfirmOpen(false); }
        setWithdrawOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-orange-500" />
              Withdraw Funds
            </DialogTitle>
            <DialogDescription>Withdraw money from your wallet</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  min="10"
                  max={balance}
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
              {withdrawNum > 0 && withdrawNum < 10 && (
                <p className="text-xs text-destructive">Minimum withdrawal is $10.00</p>
              )}
              {withdrawNum > balance && (
                <p className="text-xs text-destructive">Insufficient balance</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">Available Balance</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">${balance.toFixed(2)}</span>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Minimum withdrawal is $10.00. Sandbox withdrawals are instant.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setWithdrawOpen(false); setWithdrawAmount(''); }}>Cancel</Button>
            <Button
              onClick={handleWithdrawClick}
              disabled={!withdrawNum || withdrawNum < 10 || withdrawNum > balance || withdrawLoading}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2"
            >
              {withdrawLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><ArrowUpCircle className="w-4 h-4" /> Withdraw</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Withdraw Confirmation ───────────────────────────────────── */}
      <AlertDialog open={withdrawConfirmOpen} onOpenChange={setWithdrawConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw <strong>${withdrawNum.toFixed(2)}</strong> from your wallet?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              Confirm Withdrawal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Tip Dialog ──────────────────────────────────────────────── */}
      <TipDialog
        recipientId={tipRecipientId}
        recipientUsername={tipRecipientUsername}
        open={tipOpen}
        onOpenChange={(open) => {
          if (!open) { setTipRecipientId(''); setTipRecipientUsername(''); }
          setTipOpen(open);
        }}
        onSuccess={handleTipSuccess}
      />
    </div>
  );
}

// ─── Transaction Row Component ──────────────────────────────────────
function TransactionRow({ transaction }: { transaction: TransactionItem }) {
  const config = TX_TYPE_CONFIG[transaction.type] || TX_TYPE_CONFIG.earning;
  const statusConfig = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.completed;
  const Icon = config.icon;
  const isPositive = transaction.type === 'earning' || transaction.type === 'reward' || transaction.type === 'deposit';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{transaction.description || config.label}</p>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusConfig.className}`}>
            {statusConfig.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{timeAgo(transaction.createdAt)}</p>
      </div>
      <p className={`text-sm font-bold shrink-0 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
        {formatMoney(transaction.amount)}
      </p>
    </div>
  );
}
