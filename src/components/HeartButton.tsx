import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface HeartButtonProps {
  appId: string;
  initialCount: number;
  initialHearted?: boolean;
  onHeartChange?: (newCount: number, hearted: boolean) => void;
}

export function HeartButton({ appId, initialCount, initialHearted = false, onHeartChange }: HeartButtonProps) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [hearted, setHearted] = useState(initialHearted);
  const [animating, setAnimating] = useState(false);

  const handleClick = async () => {
    if (!user) {
      toast.error('Please sign in to upvote apps');
      return;
    }

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    if (hearted) {
      // Remove upvote
      const { error } = await supabase
        .from('upvotes')
        .delete()
        .eq('user_id', user.id)
        .eq('app_id', appId);
      
      if (!error) {
        const newCount = count - 1;
        setCount(newCount);
        setHearted(false);
        onHeartChange?.(newCount, false);
      }
    } else {
      // Add upvote
      const { error } = await supabase
        .from('upvotes')
        .insert({ user_id: user.id, app_id: appId });
      
      if (!error) {
        const newCount = count + 1;
        setCount(newCount);
        setHearted(true);
        onHeartChange?.(newCount, true);
        toast.success('App upvoted! ❤️');
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200',
        hearted 
          ? 'bg-heart/10 text-heart' 
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Heart
        className={cn(
          'w-4 h-4 transition-all',
          hearted && 'fill-current',
          animating && 'animate-heart-pop'
        )}
      />
      <span className="text-sm font-semibold">{count}</span>
    </button>
  );
}
