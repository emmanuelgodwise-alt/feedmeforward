'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Palette,
  Link2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  subtitle?: string;
}

const COLOR_PRESETS = [
  { name: 'Default', fg: '#000000', bg: '#FFFFFF' },
  { name: 'Ocean', fg: '#1e3a5f', bg: '#e8f4f8' },
  { name: 'Forest', fg: '#2d5016', bg: '#edf7e6' },
  { name: 'Sunset', fg: '#c2410c', bg: '#fff7ed' },
  { name: 'Royal', fg: '#581c87', bg: '#faf5ff' },
  { name: 'Dark', fg: '#f5f5f4', bg: '#1c1917' },
  { name: 'Rose', fg: '#be123c', bg: '#fff1f2' },
  { name: 'FMF Brand', fg: '#ea580c', bg: '#fffbeb' },
];

const SIZE_OPTIONS = [
  { label: 'Small', value: 200 },
  { label: 'Medium', value: 300 },
  { label: 'Large', value: 500 },
  { label: 'Print', value: 800 },
];

export function QRCodeDialog({ open, onOpenChange, url, title, subtitle }: QRCodeDialogProps) {
  const { toast } = useToast();
  const [customUrl, setCustomUrl] = useState(url);
  const [qrSize, setQrSize] = useState(300);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [showCustomColors, setShowCustomColors] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Sync URL prop
  useEffect(() => {
    if (url) setCustomUrl(url);
  }, [url]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setCustomUrl(url);
      setQrError(false);
      setCopied(false);
      setExpanded(false);
    }
  }, [open, url]);

  const getQrUrl = useCallback(() => {
    if (!customUrl) return '';
    const params = new URLSearchParams({
      url: customUrl,
      size: qrSize.toString(),
      fg: fgColor,
      bg: bgColor,
      format,
    });
    return `/api/qr/generate?${params.toString()}`;
  }, [customUrl, qrSize, fgColor, bgColor, format]);

  const qrImageUrl = getQrUrl();

  const isValidUrl = (() => {
    try { new URL(customUrl); return true; } catch { return false; }
  })();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(customUrl);
      setCopied(true);
      toast({ title: 'Link copied!', description: 'URL copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownload = async () => {
    if (!isValidUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      if (!response.ok) throw new Error('Failed to fetch QR');
      const blob = await response.blob();
      const extension = format === 'svg' ? 'svg' : 'png';
      const fileName = title
        ? `fmf-qr-${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.${extension}`
        : `fmf-qr-code.${extension}`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ title: 'QR code downloaded!', description: `Saved as ${fileName}` });
    } catch {
      toast({ title: 'Download failed', description: 'Could not download QR code', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setFgColor(preset.fg);
    setBgColor(preset.bg);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-lg max-h-[90vh] flex flex-col ${expanded ? 'sm:max-w-xl' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            QR Code
          </DialogTitle>
          <DialogDescription>
            {subtitle || title ? `Generate a scannable QR code for "${subtitle || title}"` : 'Generate a scannable QR code'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5">
          {/* ── URL Input ── */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Destination URL
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://..."
                  className="pl-8 text-xs bg-muted/50"
                />
              </div>
              <Button
                size="sm"
                variant={copied ? 'default' : 'outline'}
                className={`shrink-0 gap-1.5 ${copied ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /></>
                )}
              </Button>
            </div>
            {!isValidUrl && customUrl && (
              <p className="text-xs text-rose-500 mt-1">Please enter a valid URL</p>
            )}
          </div>

          {/* ── QR Code Preview ── */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              layout
              className={`relative rounded-2xl overflow-hidden shadow-lg border-2 transition-all ${
                expanded ? 'p-6' : 'p-4'
              }`}
              style={{ backgroundColor: bgColor }}
              onClick={() => setExpanded(!expanded)}
            >
              {isValidUrl && (
                <img
                  src={qrImageUrl}
                  alt="QR Code"
                  className={`transition-all duration-300 ${expanded ? 'w-80 h-80' : 'w-56 h-56'}`}
                  onError={() => setQrError(true)}
                  onLoad={() => setQrError(false)}
                />
              )}
              {qrError && (
                <div className="w-56 h-56 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Failed to generate</p>
                </div>
              )}
              {!isValidUrl && (
                <div className="w-56 h-56 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Expand/Collapse overlay */}
              <button
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                {expanded ? (
                  <Minimize2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </motion.div>

            <p className="text-[10px] text-muted-foreground text-center">
              Click the QR code to {expanded ? 'collapse' : 'expand'} preview
            </p>
          </div>

          <Separator />

          {/* ── Color Presets ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Color Theme
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 gap-1"
                onClick={() => setShowCustomColors(!showCustomColors)}
              >
                {showCustomColors ? 'Presets' : 'Custom'}
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {!showCustomColors ? (
                <motion.div
                  key="presets"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-4 gap-2"
                >
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                        fgColor === preset.fg && bgColor === preset.bg
                          ? 'border-orange-400 shadow-sm'
                          : 'border-transparent hover:border-muted'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-md border border-muted"
                        style={{ backgroundColor: preset.bg }}
                      >
                        <div className="w-full h-1.5 rounded-t-md" style={{ backgroundColor: preset.fg }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{preset.name}</span>
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Label className="text-xs w-16 shrink-0">Foreground</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="text-xs font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs w-16 shrink-0">Background</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="text-xs font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator />

          {/* ── Size & Format ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Size
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setQrSize(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      qrSize === opt.value
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                Format
              </Label>
              <div className="flex gap-1.5">
                {(['png', 'svg'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium uppercase transition-colors ${
                      format === f
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Download Buttons ── */}
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              onClick={handleDownload}
              disabled={!isValidUrl || downloading}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download QR Code
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (isValidUrl) window.open(customUrl, '_blank');
              }}
              disabled={!isValidUrl}
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </Button>
          </div>

          {/* ── Use Cases ── */}
          <div className="rounded-xl bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <QrCode className="w-3 h-3" />
              Use this QR code for:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">Printed Flyers</Badge>
              <Badge variant="secondary" className="text-[10px]">Event Posters</Badge>
              <Badge variant="secondary" className="text-[10px]">Business Cards</Badge>
              <Badge variant="secondary" className="text-[10px]">Social Media</Badge>
              <Badge variant="secondary" className="text-[10px]">Email Signatures</Badge>
              <Badge variant="secondary" className="text-[10px]">Live Events</Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
