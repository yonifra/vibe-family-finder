import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Share2, Pencil } from 'lucide-react';
import { TierBadge } from './TierBadge';
import { HeartButton } from './HeartButton';
import { TagPill } from './TagPill';
import { EditAppModal } from './EditAppModal';
import type { App, Tag } from '@/lib/types';
import { toAppSlug } from '@/lib/appRedirects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AppCardProps {
  app: App;
  tags?: Tag[];
  hasUpvoted?: boolean;
}

export function AppCard({ app, tags = [], hasUpvoted = false }: AppCardProps) {
  const { user } = useAuth();
  const slugPath = `/${toAppSlug(app.name)}`;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const titleRef = useCallback((node: HTMLHeadingElement | null) => {
    if (node) {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    }
  }, []);

  const isOwner = user?.id === app.creator_id;

  return (
    <>
      <article className="card-elevated p-5 flex flex-col gap-4 animate-fade-in group relative">
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-accent z-10"
            onClick={() => setEditModalOpen(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
              <Tooltip open={isTruncated ? undefined : false}>
                <TooltipTrigger asChild>
                  <h3 ref={titleRef} className="font-bold text-lg text-foreground leading-tight truncate">
                    {app.name}
                  </h3>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {app.name}
                </TooltipContent>
              </Tooltip>
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={async () => {
                const shareUrl = app.creator 
                  ? `${window.location.origin}/creator/${app.creator.username}` 
                  : window.location.href;
                const shareData = {
                  title: app.name,
                  text: `Check out ${app.name} on FamilyTech Sandbox!`,
                  url: shareUrl,
                };
                
                if (navigator.share && navigator.canShare?.(shareData)) {
                  try {
                    await navigator.share(shareData);
                  } catch (err) {
                    if ((err as Error).name !== 'AbortError') {
                      console.error('Share failed:', err);
                    }
                  }
                } else {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success('Link copied to clipboard!');
                }
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            
            <Link
              to={slugPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
            >
              Try It
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </article>
      
      {isOwner && (
        <EditAppModal
          app={app}
          currentTags={tags}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />
      )}
    </>
  );
}
