import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QUICK_FEEDBACK_TAGS, type QuickFeedbackTag } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  appId: string;
  appName: string;
}

export function FeedbackModal({ appId, appName }: FeedbackModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<QuickFeedbackTag[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: QuickFeedbackTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to send feedback');
      return;
    }

    if (selectedTags.length === 0 && !message.trim()) {
      toast.error('Please select at least one tag or write a message');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase.from('feedback').insert({
      app_id: appId,
      user_id: user.id,
      quick_tags: selectedTags,
      message: message.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to send feedback');
    } else {
      toast.success('Feedback sent privately to the creator! 📬');
      setOpen(false);
      setSelectedTags([]);
      setMessage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <MessageCircle className="w-4 h-4" />
          Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Private Feedback for {appName}</DialogTitle>
          <DialogDescription>
            Your feedback is sent directly to the creator. No public shaming here! 💜
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Tags</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_FEEDBACK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Message (optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share detailed feedback with the creator..."
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Sending...' : 'Send Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
