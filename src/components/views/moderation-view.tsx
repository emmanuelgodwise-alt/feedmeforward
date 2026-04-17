'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  Shield,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  Video,
  MessageCircle,
  User,
  Flag,
} from 'lucide-react';
interface ModerationViewProps {
  onNavigate: (view: string) => void;
}

interface ReportItem {
  id: string;
  reporterId: string;
  videoId: string | null;
  commentId: string | null;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  targetType: 'video' | 'comment';
  reporter: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  video?: { id: string; title: string; thumbnailUrl: string | null } | null;
  comment?: { id: string; content: string; user: { id: string; username: string } } | null;
}

interface ReportStats {
  pending: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: AlertTriangle };
    case 'reviewing':
      return { label: 'Reviewing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Eye };
    case 'resolved':
      return { label: 'Resolved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle2 };
    case 'dismissed':
      return { label: 'Dismissed', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400', icon: XCircle };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-600', icon: AlertTriangle };
  }
}

function getReasonConfig(reason: string) {
  switch (reason) {
    case 'offensive':
      return { label: 'Offensive', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    case 'spam':
      return { label: 'Spam', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' };
    case 'misleading':
      return { label: 'Misleading', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
    default:
      return { label: 'Other', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400' };
  }
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
] as const;

export function ModerationView({ onNavigate }: ModerationViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    reportId: string;
    action: 'reviewing' | 'resolved' | 'dismissed';
    title: string;
    description: string;
  }>({ open: false, reportId: '', action: 'reviewing', title: '', description: '' });
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userRole = currentUser?.role || 'member';
  const canModerate = userRole === 'moderator' || userRole === 'admin';

  const fetchReports = useCallback(async (pageNum: number, filter: string, append: boolean = false) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '20',
      });
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/reports/list?${params}`, {
        headers: { 'X-User-Id': currentUser?.id || '' },
      });
      const json = await res.json();

      if (json.success) {
        setReports(append ? (prev) => [...prev, ...json.reports] : json.reports);
        setStats(json.stats);
        setHasMore(pageNum < json.pagination.totalPages);
        setTotalPages(json.pagination.totalPages);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to fetch reports', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Failed to fetch reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, toast]);

  useEffect(() => {
    if (canModerate) {
      setLoading(true);
      setPage(1);
      fetchReports(1, activeFilter);
    }
  }, [activeFilter, canModerate, fetchReports]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReports(nextPage, activeFilter, true);
  };

  const handleAction = (report: ReportItem, action: 'reviewing' | 'resolved' | 'dismissed') => {
    const titles: Record<string, string> = {
      reviewing: 'Start Review',
      resolved: 'Resolve Report',
      dismissed: 'Dismiss Report',
    };
    const descriptions: Record<string, string> = {
      reviewing: `Mark "${report.targetType === 'video' ? report.video?.title || 'this video' : 'this comment'}" as under review?`,
      resolved: `This will DELETE the reported ${report.targetType}. Are you sure?`,
      dismissed: `Dismiss this report? The content will remain visible.`,
    };
    setActionDialog({
      open: true,
      reportId: report.id,
      action,
      title: titles[action],
      description: descriptions[action],
    });
    setActionNote('');
  };

  const submitAction = async () => {
    if (!actionDialog.reportId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${actionDialog.reportId}/moderate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({
          action: actionDialog.action,
          note: actionNote.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const actionLabels: Record<string, string> = {
          reviewing: 'reviewing',
          resolved: 'resolved and content deleted',
          dismissed: 'dismissed',
        };
        toast({
          title: `Report ${actionLabels[actionDialog.action]}`,
          description: 'Moderation action applied successfully.',
        });

        // Refresh reports
        setLoading(true);
        setPage(1);
        fetchReports(1, activeFilter);
      } else {
        toast({ title: 'Action failed', description: json.error || 'Could not moderate report', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Failed to moderate report', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setActionDialog({ open: false, reportId: '', action: 'reviewing', title: '', description: '' });
    }
  };

  // Access denied
  if (!canModerate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Only moderators and admins can access this page.</p>
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Pending',
      count: stats?.pending ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      borderColor: 'border-amber-200 dark:border-amber-800/40',
    },
    {
      label: 'Under Review',
      count: stats?.reviewing ?? 0,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      borderColor: 'border-blue-200 dark:border-blue-800/40',
    },
    {
      label: 'Resolved',
      count: stats?.resolved ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    },
    {
      label: 'Dismissed',
      count: stats?.dismissed ?? 0,
      icon: XCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-950/50',
      borderColor: 'border-gray-200 dark:border-gray-800/40',
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
          <span className="text-sm">Back to Dashboard</span>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-500" />
          Moderation
        </h1>
      </motion.div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`border ${stat.borderColor} ${stat.bgColor}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeFilter === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveFilter(tab.key); setPage(1); }}
            className={`shrink-0 ${
              activeFilter === tab.key
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600'
                : 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && stats && (
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] px-1.5 py-0"
              >
                {stats[tab.key as keyof ReportStats]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports to review</h3>
          <p className="text-muted-foreground">
            {activeFilter === 'all'
              ? 'All clear! No reports have been filed.'
              : `No ${activeFilter} reports found.`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const statusConfig = getStatusConfig(report.status);
            const reasonConfig = getReasonConfig(report.reason);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Reporter Info */}
                      <div className="flex items-center gap-3 sm:w-48 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {report.reporter.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {report.reporter.displayName || report.reporter.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{report.reporter.username}</p>
                        </div>
                      </div>

                      {/* Target Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            {report.targetType === 'video' ? (
                              <><Video className="w-3 h-3" /> Video</>
                            ) : (
                              <><MessageCircle className="w-3 h-3" /> Comment</>
                            )}
                          </Badge>
                          <Badge className={`text-[10px] ${reasonConfig.className}`}>
                            {reasonConfig.label}
                          </Badge>
                          <Badge className={`text-[10px] ${statusConfig.className}`}>
                            <StatusIcon className="w-3 h-3 mr-0.5" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <p className="text-sm font-medium truncate">
                          {report.targetType === 'video'
                            ? report.video?.title || 'Deleted video'
                            : report.comment?.content
                              ? report.comment.content.length > 100
                                ? report.comment.content.slice(0, 100) + '...'
                                : report.comment.content
                              : 'Deleted comment'}
                        </p>

                        {report.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {report.description}
                          </p>
                        )}

                        <p className="text-[11px] text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {timeAgo(report.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      {(report.status === 'pending' || report.status === 'reviewing') && (
                        <div className="flex items-center gap-2 sm:shrink-0">
                          {report.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                              onClick={() => handleAction(report, 'reviewing')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                            onClick={() => handleAction(report, 'resolved')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-950/30 text-gray-600 dark:text-gray-400"
                            onClick={() => handleAction(report, 'dismissed')}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                className="gap-2 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              >
                <Loader2 className="w-4 h-4" />
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog((d) => ({ ...d, open }))}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500" />
              {actionDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Input
              placeholder="Moderator note (optional)"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submitAction();
              }}
              disabled={isSubmitting}
              className={
                actionDialog.action === 'resolved'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white gap-2'
                  : actionDialog.action === 'dismissed'
                  ? 'bg-gray-500 hover:bg-gray-600 text-white gap-2'
                  : 'bg-blue-500 hover:bg-blue-600 text-white gap-2'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
