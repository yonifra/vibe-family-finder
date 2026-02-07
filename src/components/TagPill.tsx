import { cn } from '@/lib/utils';
import type { TagCategory } from '@/lib/types';

interface TagPillProps {
  name: string;
  category: TagCategory;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function TagPill({ name, category, selected, onClick, size = 'md' }: TagPillProps) {
  const baseClasses = cn(
    'tag-pill',
    size === 'sm' && 'text-xs px-2 py-1',
    {
      'tag-pill-age': category === 'age_group' && !selected,
      'tag-pill-topic': category === 'topic' && !selected,
      'tag-pill-vibe': category === 'vibe' && !selected,
      'tag-pill-selected': selected,
    }
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
    >
      {name}
    </button>
  );
}
