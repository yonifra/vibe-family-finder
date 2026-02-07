import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { TierBadge } from './TierBadge';
import { HeartButton } from './HeartButton';
import { TagPill } from './TagPill';
import type { App, Tag } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppCardProps {
  app: App;
  tags?: Tag[];
  hasUpvoted?: boolean;
}

export function AppCard({ app, tags = [], hasUpvoted = false }: AppCardProps) {
  return (
    <article className="card-elevated p-5 flex flex-col gap-4 animate-fade-in group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-muted flex items-center justify-center overflow-hidden shrink-0">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {app.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-foreground leading-tight truncate">
              {app.name}
            </h3>
            {app.creator && (
              <Link 
                to={`/creator/${app.creator.username}`}
                className="flex items-center gap-1.5 mt-1 group/creator"
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={app.creator.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {app.creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground group-hover/creator:text-foreground transition-colors">
                  {app.creator.display_name || app.creator.username}
                </span>
              </Link>
            )}
          </div>
        </div>
        <TierBadge tier={app.tier} size="sm" />
      </div>

      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
        {app.description}
      </p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 4).map((tag) => (
            <TagPill key={tag.id} name={tag.name} category={tag.category} size="sm" />
          ))}
          {tags.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">
              +{tags.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <HeartButton 
          appId={app.id} 
          initialCount={app.upvotes_count} 
          initialHearted={hasUpvoted} 
        />
        
        <a
          href={app.app_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
        >
          Try It
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}
