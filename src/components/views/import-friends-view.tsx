'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import {
  Contact,
  Mail,
  Share2,
  Users,
  Link,
  Copy,
  CheckCircle2,
  Upload,
  FileText,
  Phone,
  Globe,
  ArrowRight,
  Gift,
  DollarSign,
  Loader2,
  UserPlus,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
interface ViewProps {
  onNavigate: (view: string) => void;
}

interface PlatformUser {
  email: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface ContactItem {
  name: string;
  email?: string;
  phone?: string;
  onPlatform?: boolean;
  platformUser?: PlatformUser;
  selected?: boolean;
}

interface ReferralStats {
  totalInvited: number;
  totalAccepted: number;
  totalOnPlatform: number;
  totalEarned: number;
  conversionRate: number;
  recentInvitations: {
    id: string;
    inviteeEmail: string;
    status: string;
    rewardGiven: boolean;
    createdAt: string;
    respondedAt: string | null;
  }[];
}

interface ShareLinks {
  referralCode: string;
  referralUrl: string;
  invitationMessage: string;
  shareLinks: {
    whatsapp: string;
    twitter: string;
    facebook: string;
    linkedin: string;
    telegram: string;
    email: string;
  };
}

interface CSVResult {
  parsed: string[];
  valid: string[];
  invalid: string[];
  totalRows?: number;
  hasHeader?: boolean;
}

type TabType = 'contacts' | 'email' | 'social';
type EmailStep = 'input' | 'preview' | 'sending' | 'success';
type ContactsStep = 'idle' | 'review' | 'sending' | 'success';

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ─── Component ────────────────────────────────────────────────────
export function ImportFriendsView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('contacts');

  // Referral stats
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Contacts tab state
  const [contactsStep, setContactsStep] = useState<ContactsStep>('idle');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactPickerSupported, setContactPickerSupported] = useState(true);
  const [contactsCreatedCount, setContactsCreatedCount] = useState(0);

  // Email tab state
  const [emailStep, setEmailStep] = useState<EmailStep>('input');
  const [emailText, setEmailText] = useState('');
  const [emailParsedEmails, setEmailParsedEmails] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<CSVResult | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [emailSelected, setEmailSelected] = useState<Set<string>>(new Set());
  const [emailSending, setEmailSending] = useState(false);
  const [emailCreatedCount, setEmailCreatedCount] = useState(0);
  const [emailSubTab, setEmailSubTab] = useState<'manual' | 'csv'>('manual');

  // Social tab state
  const [shareLinks, setShareLinks] = useState<ShareLinks | null>(null);
  const [shareLinksLoading, setShareLinksLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  // ─── Fetch Stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/invitations/referral-stats', {
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, [currentUser]);

  // ─── Fetch Share Links ──────────────────────────────────────────
  const fetchShareLinks = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/invitations/social-share-links', {
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setShareLinks(json.data);
      }
    } catch {
      // silent
    } finally {
      setShareLinksLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchStats();
      fetchShareLinks();
    }
  }, [currentUser, fetchStats, fetchShareLinks]);

  // Check Contact Picker API support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator) {
      setContactPickerSupported(true);
    } else {
      setContactPickerSupported(false);
    }
  }, []);

  // ─── Contacts: Import from Contact Picker ───────────────────────
  const handleImportContacts = async () => {
    if (!currentUser) return;
    setContactsLoading(true);

    try {
      const contactsApi = (navigator as unknown as { contacts?: { select: (fields: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; email?: string[] }>> } }).contacts;
      if (!contactsApi || !contactsApi.select) {
        toast({
          title: 'Contact Picker not available',
          description: 'Your browser does not support the Contact Picker API. Try Chrome on Android or Edge on desktop.',
          variant: 'destructive',
        });
        setContactsLoading(false);
        return;
      }

      const selected = await contactsApi.select(['name', 'email'], { multiple: true });

      if (!selected || selected.length === 0) {
        setContactsLoading(false);
        return;
      }

      // Build contacts array
      const contactItems: ContactItem[] = selected.map((c: { name?: string[]; email?: string[] }) => ({
        name: Array.isArray(c.name) ? c.name.join(' ') : (c.name || 'Unknown'),
        email: Array.isArray(c.email) && c.email.length > 0 ? c.email[0] : undefined,
      })).filter((c: ContactItem) => c.email && c.email.length > 0);

      if (contactItems.length === 0) {
        toast({
          title: 'No emails found',
          description: 'None of your selected contacts had email addresses.',
          variant: 'destructive',
        });
        setContactsLoading(false);
        return;
      }

      // Send to server to check platform membership
      const emails = contactItems.map((c: ContactItem) => c.email!);
      const res = await fetch('/api/invitations/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ contacts: contactItems }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast({
          title: 'Failed to process contacts',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
        setContactsLoading(false);
        return;
      }

      const data = json.data;
      const onPlatformMap = new Map(data.onPlatform.map((u: PlatformUser) => [u.email, u]));
      const invitedSet = new Set(data.invited);

      // Build final contact list with platform status
      const enrichedContacts = contactItems.map((c: ContactItem) => ({
        ...c,
        onPlatform: onPlatformMap.has(c.email!),
        platformUser: onPlatformMap.get(c.email!) as PlatformUser | undefined,
      })) as ContactItem[];

      setContacts(enrichedContacts);
      // Auto-select non-platform contacts that haven't been invited yet
      const newContacts = enrichedContacts.filter(
        (c) => !c.onPlatform && !invitedSet.has(c.email!)
      );
      setSelectedContacts(new Set(newContacts.map((c) => c.email!)));
      setContactsStep('review');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        // User cancelled
      } else {
        toast({
          title: 'Error importing contacts',
          description: 'Please try again or use the email import tab.',
          variant: 'destructive',
        });
      }
    } finally {
      setContactsLoading(false);
    }
  };

  // ─── Contacts: Send Invitations ─────────────────────────────────
  const handleSendContactInvites = async () => {
    if (!currentUser || selectedContacts.size === 0) return;
    setContactsStep('sending');

    try {
      const emails = [...selectedContacts];
      const res = await fetch('/api/invitations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ emails }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast({
          title: 'Failed to send invitations',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
        setContactsStep('review');
        return;
      }

      setContactsCreatedCount(json.data.createdCount);
      setContactsStep('success');
      fetchStats();

      toast({
        title: `Invitations sent! 🎉`,
        description: `${json.data.createdCount} invitation${json.data.createdCount !== 1 ? 's' : ''} sent. +${json.data.scorePointsEarned} points!`,
      });
    } catch {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
      setContactsStep('review');
    }
  };

  // ─── Email: Parse Manual Input ──────────────────────────────────
  const handleParseEmails = () => {
    if (!emailText.trim()) return;

    const matches = emailText.match(EMAIL_REGEX);
    if (!matches || matches.length === 0) {
      toast({
        title: 'No valid emails found',
        description: 'Please enter email addresses separated by commas or new lines.',
        variant: 'destructive',
      });
      return;
    }

    const unique = [...new Set(matches.map((e) => e.toLowerCase().trim()))];
    setEmailParsedEmails(unique);
    setEmailSelected(new Set(unique));
    setEmailStep('preview');
  };

  // ─── Email: Parse CSV File ──────────────────────────────────────
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setCsvFile(file);
    setCsvLoading(true);

    try {
      const text = await file.text();
      const res = await fetch('/api/invitations/csv-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ csvText: text }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast({
          title: 'Failed to parse CSV',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
        setCsvLoading(false);
        return;
      }

      setCsvResult(json.data);
      if (json.data.valid.length > 0) {
        setEmailSelected(new Set(json.data.valid));
        setEmailParsedEmails(json.data.valid);
        setEmailStep('preview');
      }
    } catch {
      toast({
        title: 'Failed to read file',
        description: 'Please try a different file.',
        variant: 'destructive',
      });
    } finally {
      setCsvLoading(false);
    }
  };

  // ─── Email: Send Invitations ────────────────────────────────────
  const handleSendEmailInvites = async () => {
    if (!currentUser || emailSelected.size === 0) return;
    setEmailStep('sending');

    try {
      const emails = [...emailSelected];
      // Process in batches of 10
      let totalCreated = 0;
      for (let i = 0; i < emails.length; i += 10) {
        const batch = emails.slice(i, i + 10);
        const res = await fetch('/api/invitations/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
          },
          body: JSON.stringify({ emails: batch }),
        });
        const json = await res.json();
        if (json.success) {
          totalCreated += json.data.createdCount;
        }
      }

      setEmailCreatedCount(totalCreated);
      setEmailStep('success');
      fetchStats();

      toast({
        title: `Invitations sent! 🎉`,
        description: `${totalCreated} invitation${totalCreated !== 1 ? 's' : ''} sent!`,
      });
    } catch {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
      setEmailStep('preview');
    }
  };

  // ─── Social: Copy Link ──────────────────────────────────────────
  const handleCopyLink = async () => {
    if (!shareLinks) return;
    try {
      await navigator.clipboard.writeText(shareLinks.referralUrl);
      setLinkCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Referral link copied to clipboard',
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  // ─── Toggle email selection ─────────────────────────────────────
  const toggleEmailSelection = (email: string) => {
    setEmailSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  // ─── Toggle contact selection ───────────────────────────────────
  const toggleContactSelection = (email: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  // ─── Unauthenticated State ──────────────────────────────────────
  if (!currentUser) {
    return (
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/20">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Import Friends</CardTitle>
            <CardDescription>Sign in to import and invite friends</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md" onClick={() => onNavigate('signup')}>Get Started Free</Button>
            <Button variant="outline" className="w-full" onClick={() => onNavigate('login')}>Sign In</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Stats Cards ───────────────────────────────────────────────
  const statsCards = [
    { icon: Send, label: 'Invited', value: stats?.totalInvited ?? 0, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/50' },
    { icon: CheckCircle2, label: 'Accepted', value: stats?.totalAccepted ?? 0, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { icon: DollarSign, label: 'Earned', value: `$${(stats?.totalEarned ?? 0).toFixed(2)}`, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950/50' },
    { icon: Users, label: 'Rate', value: `${stats?.conversionRate ?? 0}%`, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/50' },
  ];

  const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'contacts', label: 'Phone Contacts', icon: Contact },
    { key: 'email', label: 'Email Import', icon: Mail },
    { key: 'social', label: 'Social Media', icon: Share2 },
  ];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
          <span className="text-sm">Back to Dashboard</span>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold">Import Friends</h1>
          </div>
          <p className="text-sm text-muted-foreground">Import from contacts, email, or social media</p>
        </div>
      </motion.div>


      {/* ─── Referral Stats ───────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          statsCards.map((stat) => (
            <motion.div key={stat.label} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Card className={`${stat.bgColor} border-0 shadow-sm h-full`}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="mb-8">
        <div className="flex gap-1 border-b border-border/50 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* ═══ TAB 1: PHONE CONTACTS ═════════════════════════════ */}
          {activeTab === 'contacts' && (
            <motion.div key="contacts" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {contactsStep === 'idle' && (
                <Card className="border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                        <Contact className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Import from Contacts</CardTitle>
                        <CardDescription>Use your phone contacts to find friends</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!contactPickerSupported && (
                      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Contact Picker not supported</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Your browser doesn&apos;t support the Contact Picker API. Try Chrome on Android or Edge on desktop.
                              You can also use the Email Import tab instead.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-center py-6 gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                        <Phone className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        Select contacts from your device. We&apos;ll check which ones are already on FeedMeForward.
                      </p>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 gap-2"
                        onClick={handleImportContacts}
                        disabled={contactsLoading || !contactPickerSupported}
                      >
                        {contactsLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                        ) : (
                          <><Contact className="w-4 h-4" /> Import from Contacts</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {contactsStep === 'review' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Contacts</CardTitle>
                    <CardDescription>
                      {contacts.filter((c) => c.onPlatform).length} on FeedMeForward, {contacts.filter((c) => !c.onPlatform).length} to invite
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Select All / None */}
                    <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-background/50 border border-border/30">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedContacts.size === contacts.filter((c) => !c.onPlatform).length && selectedContacts.size > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContacts(new Set(contacts.filter((c) => !c.onPlatform).map((c) => c.email!)));
                            } else {
                              setSelectedContacts(new Set());
                            }
                          }}
                        />
                        <span className="text-sm font-medium">Select all to invite</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {selectedContacts.size} selected
                      </Badge>
                    </div>

                    {/* Contact List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {contacts.map((contact, idx) => (
                        <motion.div
                          key={contact.email || idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/30"
                        >
                          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-300">
                              {(contact.name || contact.email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                          </div>
                          {contact.onPlatform ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 text-[10px] shrink-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> On Platform
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 text-[10px] shrink-0">
                                Invite
                              </Badge>
                              <Checkbox
                                checked={selectedContacts.has(contact.email!)}
                                onCheckedChange={() => toggleContactSelection(contact.email!)}
                              />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3">
                    <Button variant="outline" onClick={() => { setContactsStep('idle'); setContacts([]); setSelectedContacts(new Set()); }}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                      onClick={handleSendContactInvites}
                      disabled={selectedContacts.size === 0}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send {selectedContacts.size} Invitation{selectedContacts.size !== 1 ? 's' : ''}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {contactsStep === 'sending' && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    <p className="text-lg font-medium">Sending invitations...</p>
                    <p className="text-sm text-muted-foreground">Please wait while we process your contacts</p>
                  </CardContent>
                </Card>
              )}

              {contactsStep === 'success' && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <Card className="border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10">
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                      >
                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                      </motion.div>
                      <p className="text-xl font-bold">Invitations Sent! 🎉</p>
                      <p className="text-muted-foreground">
                        {contactsCreatedCount} invitation{contactsCreatedCount !== 1 ? 's' : ''} sent successfully.
                        You earned +{contactsCreatedCount * 10} points!
                      </p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => onNavigate('invitations')}>View All Invitations</Button>
                        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white" onClick={() => { setContactsStep('idle'); setContacts([]); setSelectedContacts(new Set()); }}>
                          Import More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ TAB 2: EMAIL IMPORT ════════════════════════════════ */}
          {activeTab === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {emailStep === 'input' && (
                <Card className="border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Import Emails</CardTitle>
                        <CardDescription>Add email addresses to invite</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Sub tabs */}
                    <div className="flex gap-2 mb-6">
                      <Button
                        variant={emailSubTab === 'manual' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEmailSubTab('manual')}
                        className={emailSubTab === 'manual' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : ''}
                      >
                        <FileText className="w-3 h-3 mr-1" /> Manual Entry
                      </Button>
                      <Button
                        variant={emailSubTab === 'csv' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEmailSubTab('csv')}
                        className={emailSubTab === 'csv' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : ''}
                      >
                        <Upload className="w-3 h-3 mr-1" /> CSV Upload
                      </Button>
                    </div>

                    {emailSubTab === 'manual' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email-input">Email Addresses</Label>
                          <textarea
                            id="email-input"
                            className="flex min-h-[150px] w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            placeholder="Enter emails separated by commas or new lines...&#10;friend1@example.com, friend2@example.com&#10;another@email.com"
                            value={emailText}
                            onChange={(e) => setEmailText(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Separate emails with commas, semicolons, or new lines.
                          </p>
                        </div>
                        <Button
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                          onClick={handleParseEmails}
                          disabled={!emailText.trim()}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Parse Emails
                        </Button>
                      </div>
                    )}

                    {emailSubTab === 'csv' && (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center py-8 gap-4 border-2 border-dashed border-border/50 rounded-xl">
                          <Upload className="w-10 h-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium">Upload a CSV file</p>
                            <p className="text-xs text-muted-foreground mt-1">.csv files with email addresses</p>
                          </div>
                          <label className="cursor-pointer">
                            <Input
                              type="file"
                              accept=".csv,.txt"
                              className="hidden"
                              onChange={handleCSVUpload}
                              disabled={csvLoading}
                            />
                            <Button variant="outline" asChild disabled={csvLoading}>
                              <span>
                                {csvLoading ? (
                                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Parsing...</>
                                ) : (
                                  <><Upload className="w-4 h-4 mr-2" /> Choose File</>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>

                        {csvResult && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-background/60 border border-border/50">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{csvResult.valid.length} valid</span>
                              </div>
                              {csvResult.invalid.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{csvResult.invalid.length} invalid</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Parsed {csvResult.totalRows ?? csvResult.parsed.length} rows from CSV
                              {csvResult.hasHeader && ' (header detected)'}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {emailStep === 'preview' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Emails to Invite</CardTitle>
                    <CardDescription>{emailSelected.size} of {emailParsedEmails.length} emails selected</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-background/50 border border-border/30">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={emailSelected.size === emailParsedEmails.length}
                          onCheckedChange={(checked) => {
                            setEmailSelected(checked ? new Set(emailParsedEmails) : new Set());
                          }}
                        />
                        <span className="text-sm font-medium">Select all</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{emailSelected.size} selected</Badge>
                    </div>
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {emailParsedEmails.map((email, idx) => (
                        <motion.div
                          key={email}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/30"
                        >
                          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-orange-500" />
                          </div>
                          <p className="text-sm font-medium flex-1 min-w-0 truncate">{email}</p>
                          <Checkbox checked={emailSelected.has(email)} onCheckedChange={() => toggleEmailSelection(email)} />
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3">
                    <Button variant="outline" onClick={() => { setEmailStep('input'); setEmailParsedEmails([]); setEmailSelected(new Set()); setCsvResult(null); }}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                      onClick={handleSendEmailInvites}
                      disabled={emailSelected.size === 0 || emailSending}
                    >
                      {emailSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send {emailSelected.size} Invitation{emailSelected.size !== 1 ? 's' : ''}</>}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {emailStep === 'sending' && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    <p className="text-lg font-medium">Sending invitations...</p>
                    <p className="text-sm text-muted-foreground">Please wait</p>
                  </CardContent>
                </Card>
              )}

              {emailStep === 'success' && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <Card className="border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10">
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}>
                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                      </motion.div>
                      <p className="text-xl font-bold">Invitations Sent! 🎉</p>
                      <p className="text-muted-foreground">
                        {emailCreatedCount} invitation{emailCreatedCount !== 1 ? 's' : ''} sent successfully.
                      </p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => onNavigate('invitations')}>View All Invitations</Button>
                        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white" onClick={() => { setEmailStep('input'); setEmailText(''); setEmailParsedEmails([]); setEmailSelected(new Set()); setCsvResult(null); }}>
                          Import More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ TAB 3: SOCIAL MEDIA ════════════════════════════════ */}
          {activeTab === 'social' && (
            <motion.div key="social" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              {/* Referral Link Card */}
              <Card className="border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                      <Link className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Your Referral Link</CardTitle>
                      <CardDescription>Share this link to earn $2 per sign-up</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {shareLinksLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    </div>
                  ) : shareLinks ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border/50">
                        <Link className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-sm font-mono truncate flex-1">{shareLinks.referralUrl}</p>
                        <Button
                          size="sm"
                          variant={linkCopied ? 'default' : 'outline'}
                          onClick={handleCopyLink}
                          className={linkCopied ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'gap-2 shrink-0'}
                        >
                          {linkCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        &ldquo;{shareLinks.invitationMessage}&rdquo;
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Social Share Buttons Grid */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Share on Social Media</CardTitle>
                      <CardDescription>Invite friends through your favorite platforms</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {shareLinks ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* WhatsApp */}
                      <motion.a
                        href={shareLinks.shareLinks.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shadow-sm">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">WhatsApp</p>
                            <p className="text-xs text-muted-foreground">Direct message</p>
                          </div>
                        </div>
                      </motion.a>

                      {/* X/Twitter */}
                      <motion.a
                        href={shareLinks.shareLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-300 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-950/10 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center shadow-sm">
                            <Share2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">X / Twitter</p>
                            <p className="text-xs text-muted-foreground">Post a tweet</p>
                          </div>
                        </div>
                      </motion.a>

                      {/* Facebook */}
                      <motion.a
                        href={shareLinks.shareLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Facebook</p>
                            <p className="text-xs text-muted-foreground">Share post</p>
                          </div>
                        </div>
                      </motion.a>

                      {/* LinkedIn */}
                      <motion.a
                        href={shareLinks.shareLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-sky-200 dark:border-sky-800/40 bg-sky-50/50 dark:bg-sky-950/10 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center shadow-sm">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">LinkedIn</p>
                            <p className="text-xs text-muted-foreground">Professional share</p>
                          </div>
                        </div>
                      </motion.a>

                      {/* Telegram */}
                      <motion.a
                        href={shareLinks.shareLinks.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-sky-200 dark:border-sky-800/40 bg-sky-50/50 dark:bg-sky-950/10 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center shadow-sm">
                            <Send className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Telegram</p>
                            <p className="text-xs text-muted-foreground">Send message</p>
                          </div>
                        </div>
                      </motion.a>

                      {/* Email */}
                      <motion.a
                        href={shareLinks.shareLinks.email}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/10 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Email</p>
                            <p className="text-xs text-muted-foreground">Send invitation</p>
                          </div>
                        </div>
                      </motion.a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reward Info */}
              <Card className="border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">Earn $2 per sign-up!</p>
                      <p className="text-sm text-muted-foreground">When your friend signs up using your referral link, you earn $2 added to your wallet balance.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          FeedMeForward Import Friends &mdash; Grow the community together
        </p>
      </motion.div>
    </motion.div>
  );
}
