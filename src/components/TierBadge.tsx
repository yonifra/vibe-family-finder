import { cn } from '@/lib/utils';
import { Sparkles, FlaskConical } from 'lucide-react';

interface TierBadgeProps {
  tier: 'sandbox' | 'main_stage';
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  return (
    <span
      className={cn(
        'tier-badge gap-1',
        tier === 'sandbox' ? 'tier-sandbox' : 'tier-main-stage',
        size === 'sm' && 'text-[10px] px-2 py-0.5'
      )}
    >
      {tier === 'sandbox' ? (
        <>
          <FlaskConical className={cn('w-3 h-3', size === 'sm' && 'w-2.5 h-2.5')} />
          Sandbox
        </>
      ) : (
        <>
          <Sparkles className={cn('w-3 h-3', size === 'sm' && 'w-2.5 h-2.5')} />
          Main Stage
        </>
      )}
    </span>
  );
}
