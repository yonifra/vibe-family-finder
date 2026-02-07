import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Heart, UserCheck, TrendingUp, Sparkles, FlaskConical } from 'lucide-react';
import type { App } from '@/lib/types';

interface CreatorAnalyticsProps {
  creatorId: string;
}

export function CreatorAnalytics({ creatorId }: CreatorAnalyticsProps) {
  // Fetch total platform users
  const { data: totalUsers = 0 } = useQuery({
    queryKey: ['platform-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch creator's apps with stats
  const { data: creatorApps = [] } = useQuery({
    queryKey: ['creator-apps-analytics', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select('id, name, upvotes_count, tier, created_at')
        .eq('creator_id', creatorId)
        .order('upvotes_count', { ascending: false });
      if (error) throw error;
      return data as Pick<App, 'id' | 'name' | 'upvotes_count' | 'tier' | 'created_at'>[];
    },
  });

  // Fetch follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: ['follower-count-analytics', creatorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', creatorId);
      if (error) throw error;
      return count || 0;
    },
  });

  const totalUpvotes = creatorApps.reduce((sum, app) => sum + app.upvotes_count, 0);
  const mainStageApps = creatorApps.filter(app => app.tier === 'main_stage').length;
  const sandboxApps = creatorApps.filter(app => app.tier === 'sandbox').length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Analytics Dashboard
      </h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Platform Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Total Upvotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUpvotes.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Followers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{followerCount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Your Apps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{creatorApps.length}</p>
            <p className="text-xs text-muted-foreground">
              {mainStageApps} Main Stage · {sandboxApps} Sandbox
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-App Stats */}
      {creatorApps.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">App Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creatorApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {app.tier === 'main_stage' ? (
                      <Sparkles className="w-4 h-4 text-main-stage" />
                    ) : (
                      <FlaskConical className="w-4 h-4 text-sandbox" />
                    )}
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Heart className="w-4 h-4 text-destructive" />
                    <span className="font-semibold">{app.upvotes_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
