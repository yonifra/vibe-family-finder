import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TierBadge } from '@/components/TierBadge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Calendar, Sparkles, FlaskConical } from 'lucide-react';
import type { App, Profile, Tag } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);

  // Fetch creator profile
  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: ['creator', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });

  // Fetch creator's apps
  const { data: apps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['creator-apps', creator?.id],
    enabled: !!creator?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select(`
          *,
          app_tags(tag_id)
        `)
        .eq('creator_id', creator!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (App & { app_tags: { tag_id: string }[] })[];
    },
  });

  // Fetch all tags for mapping
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*');
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Check if current user is following this creator
  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', user?.id, creator?.id],
    enabled: !!user && !!creator && user.id !== creator.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user!.id)
        .eq('following_id', creator!.id)
        .maybeSingle();
      if (error) throw error;
      setFollowing(!!data);
      return !!data;
    },
  });

  // Fetch follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: ['follower-count', creator?.id],
    enabled: !!creator?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', creator!.id);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch user's upvotes
  const { data: userUpvotes = [] } = useQuery({
    queryKey: ['user-upvotes', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upvotes')
        .select('app_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data.map((u) => u.app_id);
    },
  });

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow creators');
      return;
    }

    if (!creator) return;

    if (following) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', creator.id);
      
      if (!error) {
        setFollowing(false);
        toast.success('Unfollowed');
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: creator.id });
      
      if (!error) {
        setFollowing(true);
        toast.success(`Following ${creator.display_name || creator.username}! 🎉`);
      }
    }
  };

  const getTagsForApp = (app: App & { app_tags: { tag_id: string }[] }) => {
    return app.app_tags
      ?.map((at) => tags.find((t) => t.id === at.tag_id))
      .filter(Boolean) as Tag[];
  };

  const mainStageApps = apps.filter((a) => a.tier === 'main_stage');
  const sandboxApps = apps.filter((a) => a.tier === 'sandbox');

  if (creatorLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!creator) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Creator not found</h1>
          <p className="text-muted-foreground mb-6">
            The creator you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isOwnProfile = user?.id === creator.id;

  return (
    <Layout>
      <div className="container py-12">
        {/* Profile Header */}
        <div className="card-elevated p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-accent">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="text-3xl font-bold bg-accent text-accent-foreground">
                {creator.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {creator.display_name || creator.username}
                </h1>
                {creator.is_creator && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Creator
                  </span>
                )}
              </div>

              <p className="text-muted-foreground mb-3">@{creator.username}</p>

              {creator.bio && (
                <p className="text-foreground mb-4 max-w-xl">{creator.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(creator.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <span>{followerCount} follower{followerCount !== 1 ? 's' : ''}</span>
                <span>{apps.length} app{apps.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {!isOwnProfile && (
              <Button
                onClick={handleFollow}
                variant={following ? 'outline' : 'default'}
                className="gap-2"
              >
                {following ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Apps Section */}
        {appsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-elevated p-5 h-64 animate-pulse" />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <FlaskConical className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No apps yet</h3>
            <p className="text-muted-foreground mb-6">
              {isOwnProfile
                ? "You haven't submitted any apps yet. Get started!"
                : "This creator hasn't submitted any apps yet."}
            </p>
            {isOwnProfile && (
              <Button asChild>
                <Link to="/submit">Submit Your First App</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main Stage Apps */}
            {mainStageApps.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                  <Sparkles className="w-5 h-5 text-main-stage" />
                  Main Stage
                  <span className="text-sm font-normal text-muted-foreground">
                    ({mainStageApps.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mainStageApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={{ ...app, creator }}
                      tags={getTagsForApp(app)}
                      hasUpvoted={userUpvotes.includes(app.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sandbox Apps */}
            {sandboxApps.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                  <FlaskConical className="w-5 h-5 text-sandbox" />
                  Sandbox
                  <span className="text-sm font-normal text-muted-foreground">
                    ({sandboxApps.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sandboxApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={{ ...app, creator }}
                      tags={getTagsForApp(app)}
                      hasUpvoted={userUpvotes.includes(app.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
