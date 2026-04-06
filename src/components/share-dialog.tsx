'use client';

import { useState } from 'react';
import { QRCodeDialog } from '@/components/qr/qr-code-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Check,
  Share2,
  Link2,
  Code2,
  Mail,
  Download,
  ExternalLink,
  CheckCircle2,
  X,
  QrCode,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  isLocalUpload: boolean;
}

export function ShareDialog({ open, onOpenChange, videoId, videoTitle, videoUrl, isLocalUpload }: ShareDialogProps) {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const pageUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${pageUrl}?video=${videoId}`;

  const embedCode = `<iframe src="${pageUrl}/embed/${videoId}" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="${videoTitle.replace(/"/g, '&quot;')}"></iframe>`;

  const emailSubject = encodeURIComponent(`Check out this video: ${videoTitle}`);
  const emailBody = encodeURIComponent(`Watch "${videoTitle}" on FeedMeForward:\n\n${shareUrl}`);

  const socialLinks = [
    {
      name: 'X (Twitter)',
      color: 'bg-black hover:bg-gray-800 text-white',
      icon: '𝕏',
      getUrl: () => {
        const text = encodeURIComponent(`Check out this video: "${videoTitle}" on @FeedMeForward`);
        return `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
      },
    },
    {
      name: 'Facebook',
      color: 'bg-[#1877F2] hover:bg-[#166FE5] text-white',
      icon: 'f',
      getUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'WhatsApp',
      color: 'bg-[#25D366] hover:bg-[#20BD5A] text-white',
      icon: '📱',
      getUrl: () => {
        const text = encodeURIComponent(`Check out this video: "${videoTitle}"\n${shareUrl}`);
        return `https://wa.me/?text=${text}`;
      },
    },
    {
      name: 'LinkedIn',
      color: 'bg-[#0A66C2] hover:bg-[#095BAE] text-white',
      icon: 'in',
      getUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Telegram',
      color: 'bg-[#0088CC] hover:bg-[#0077B5] text-white',
      icon: '✈️',
      getUrl: () => {
        const text = encodeURIComponent(`Check out: "${videoTitle}"`);
        return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
      },
    },
    {
      name: 'Reddit',
      color: 'bg-[#FF4500] hover:bg-[#E03E00] text-white',
      icon: '◐',
      getUrl: () => {
        const title = encodeURIComponent(videoTitle);
        return `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${title}`;
      },
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast({ title: 'Link copied!', description: 'Video link copied to clipboard.' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      toast({ title: 'Embed code copied!', description: 'You can now paste this into your website.' });
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            Share
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{videoTitle}&rdquo; with your audience
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5">
          {/* ── Social Sharing Buttons ── */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              Share on social media
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.getUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${social.color}`}
                >
                  <span className="text-sm font-bold">{social.icon}</span>
                  <span className="text-xs truncate">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Copy Link ── */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Video link
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  readOnly
                  value={shareUrl}
                  className="text-xs bg-muted/50 pr-2"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
              <Button
                size="sm"
                variant={copiedLink ? 'default' : 'outline'}
                className={`shrink-0 gap-1.5 ${copiedLink ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* ── Share via Email ── */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Share via email
            </Label>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2 justify-start text-sm">
                  <Mail className="w-4 h-4" />
                  Open email client
                </Button>
              </a>
              <Button
                size="sm"
                variant={copiedEmail ? 'default' : 'outline'}
                className={`shrink-0 gap-1.5 ${copiedEmail ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                onClick={handleCopyEmail}
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* ── Embed Code ── */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              Embed this video
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <pre className="text-xs bg-muted/50 border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-muted-foreground">
                  {embedCode}
                </pre>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`w-full gap-2 ${copiedEmbed ? 'border-emerald-300 text-emerald-600' : ''}`}
                onClick={handleCopyEmbed}
              >
                {copiedEmbed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Embed code copied!
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4" />
                    Copy embed code
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── QR Code Section ── */}
          <Separator />
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              QR Code
            </Label>
            <Button
              variant="outline"
              className="w-full gap-2 justify-start text-sm"
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="w-4 h-4 text-violet-500" />
              Generate QR Code
            </Button>
          </div>

          {/* QR Code Dialog */}
          <QRCodeDialog
            open={qrOpen}
            onOpenChange={setQrOpen}
            url={shareUrl}
            title={videoTitle}
            subtitle="Share this video via QR code"
          />

          {/* ── Download Section ── */}
          {isLocalUpload && (
            <>
              <Separator />
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Download video
                </Label>
                <Button
                  variant="outline"
                  className="w-full gap-2 justify-start text-sm"
                  onClick={() => window.open(`/api/videos/download/${videoId}`, '_blank')}
                >
                  <Download className="w-4 h-4" />
                  Download MP4
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
