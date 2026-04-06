'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type, ImageIcon, Loader2, Sparkles, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const GRADIENT_PRESETS = [
  { name: 'Sunset', value: 'from-orange-500 via-rose-500 to-pink-600' },
  { name: 'Golden', value: 'from-yellow-500 via-amber-500 to-orange-500' },
  { name: 'Berry', value: 'from-purple-500 via-pink-500 to-rose-500' },
  { name: 'Forest', value: 'from-emerald-500 via-teal-500 to-cyan-500' },
  { name: 'Ocean', value: 'from-cyan-500 via-blue-500 to-teal-500' },
  { name: 'Slate', value: 'from-gray-700 via-gray-600 to-gray-500' },
];

export function CreateStoryDialog({ open, onOpenChange, onCreated }: CreateStoryDialogProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const canSubmit =
    tab === 'text' ? text.trim().length > 0 : imageUrl.trim().length > 0;

  const handleSubmit = async () => {
    if (!currentUser || !canSubmit) return;
    setIsLoading(true);

    try {
      const body: Record<string, string> = {
        creatorId: currentUser.id,
        type: tab,
      };

      if (tab === 'text') {
        body.text = text;
      } else {
        body.imageUrl = imageUrl;
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({ title: 'Failed to create story', description: data.error || 'Something went wrong', variant: 'destructive' });
        return;
      }

      toast({ title: 'Story created! 🎉', description: 'Your story will be live for 24 hours' });
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setText('');
    setImageUrl('');
    setSelectedGradient(GRADIENT_PRESETS[0].value);
    setPreview(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Create Story
          </DialogTitle>
          <DialogDescription>
            Share a moment that disappears in 24 hours
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'text' | 'image')}>
              <TabsList className="w-full bg-muted/60">
                <TabsTrigger value="text" className="gap-1.5 flex-1">
                  <Type className="w-3.5 h-3.5" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-1.5 flex-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Image
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4 space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="resize-none text-base"
                />
                <p className="text-xs text-muted-foreground text-right">{text.length}/500</p>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Background</p>
                  <div className="flex gap-2.5 flex-wrap">
                    {GRADIENT_PRESETS.map((g) => (
                      <button
                        key={g.name}
                        onClick={() => setSelectedGradient(g.value)}
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${g.value} ring-2 transition-all ${
                          selectedGradient === g.value
                            ? 'ring-orange-500 ring-offset-2 ring-offset-background scale-110'
                            : 'ring-transparent hover:scale-105'
                        }`}
                        title={g.name}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image URL</label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                {imageUrl && (
                  <div className="rounded-lg overflow-hidden border bg-muted/30 aspect-[9/16] max-h-[300px]">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative aspect-[9/16] rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br max-h-[400px] mx-auto w-full max-w-[260px]">
              <div className={`absolute inset-0 bg-gradient-to-br ${selectedGradient}`} />
              <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
                {tab === 'text' ? (
                  <p className="text-white text-xl font-medium text-center break-words drop-shadow-lg">
                    {text}
                  </p>
                ) : imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <p className="text-white/50">No image</p>
                )}
              </div>
              {/* Creator info overlay */}
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.username.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-white text-xs font-medium drop-shadow-md">
                  {currentUser?.username}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!preview ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(true)}
              disabled={!canSubmit}
              className="gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(false)}
            >
              Edit
            </Button>
          )}
          <Button
            size="sm"
            onClick={preview ? handleSubmit : () => setPreview(true)}
            disabled={isLoading || !canSubmit}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : preview ? (
              'Share Story'
            ) : (
              'Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
