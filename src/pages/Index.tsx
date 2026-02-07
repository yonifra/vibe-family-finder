import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { AppCard } from '@/components/AppCard';
import { TagPill } from '@/components/TagPill';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, FlaskConical, Filter, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { App, Tag, TagCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

type TierFilter = 'all' | 'sandbox' | 'main_stage';

export default function Index() {
  const { user } = useAuth();
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Fetch apps with creator and tags
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['apps', tierFilter, selectedTags, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('apps')
        .select(`
          *,
          creator:profiles!apps_creator_id_fkey(*),
          app_tags(tag_id)
        `)
        .order('created_at', { ascending: false });

      if (tierFilter !== 'all') {
        query = query.eq('tier', tierFilter);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If we have tag filters, filter apps that have those tags
      let filteredApps = data || [];
      if (selectedTags.length > 0) {
        filteredApps = filteredApps.filter((app: any) => {
          const appTagIds = app.app_tags?.map((at: any) => at.tag_id) || [];
          return selectedTags.every((tagId) => appTagIds.includes(tagId));
        });
      }

      return filteredApps as (App & { app_tags: { tag_id: string }[] })[];
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

  const groupedTags = tags.reduce(
    (acc, tag) => {
      acc[tag.category] = acc[tag.category] || [];
      acc[tag.category].push(tag);
      return acc;
    },
    {} as Record<TagCategory, Tag[]>
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setTierFilter('all');
    setSearchQuery('');
  };

  const getTagsForApp = (app: App & { app_tags: { tag_id: string }[] }) => {
    return app.app_tags
      ?.map((at) => tags.find((t) => t.id === at.tag_id))
      .filter(Boolean) as Tag[];
  };

  const mainStageCount = apps.filter((a) => a.tier === 'main_stage').length;
  const sandboxCount = apps.filter((a) => a.tier === 'sandbox').length;

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
            Discover{' '}
            <span className="gradient-text">Family-Friendly</span>
            <br />
            Tech Apps
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A merit-based marketplace where the best apps rise to the top through community love, 
            not marketing budgets. Beta-test with kindness. 💜
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg rounded-full border-2 border-border focus:border-primary"
            />
          </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="pb-16">
        <div className="container">
          {/* Tier Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 p-1 bg-muted rounded-full">
              <button
                onClick={() => setTierFilter('all')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                  tierFilter === 'all'
                    ? 'bg-card text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All Apps
              </button>
              <button
                onClick={() => setTierFilter('main_stage')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all',
                  tierFilter === 'main_stage'
                    ? 'bg-card text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Sparkles className="w-4 h-4" />
                Main Stage
                <span className="text-xs bg-main-stage/20 text-main-stage px-1.5 py-0.5 rounded-full">
                  {mainStageCount}
                </span>
              </button>
              <button
                onClick={() => setTierFilter('sandbox')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all',
                  tierFilter === 'sandbox'
                    ? 'bg-card text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FlaskConical className="w-4 h-4" />
                Sandbox
                <span className="text-xs bg-sandbox/20 text-sandbox-foreground px-1.5 py-0.5 rounded-full">
                  {sandboxCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(selectedTags.length > 0 || tierFilter !== 'all' || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5"
              >
                <Filter className="w-4 h-4" />
                Filters
                {selectedTags.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    {selectedTags.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Tag Filters */}
          {showFilters && (
            <div className="card-elevated p-5 mb-6 animate-scale-in">
              <div className="space-y-4">
                {(['age_group', 'topic', 'vibe'] as TagCategory[]).map((category) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold mb-2 capitalize text-muted-foreground">
                      {category.replace('_', ' ')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {groupedTags[category]?.map((tag) => (
                        <TagPill
                          key={tag.id}
                          name={tag.name}
                          category={tag.category}
                          selected={selectedTags.includes(tag.id)}
                          onClick={() => toggleTag(tag.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apps Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card-elevated p-5 h-64 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-muted" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded-full w-16" />
                    <div className="h-6 bg-muted rounded-full w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <FlaskConical className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No apps yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to submit an app to the sandbox!
              </p>
              <Button asChild>
                <a href="/submit">Submit Your App</a>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {apps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  tags={getTagsForApp(app)}
                  hasUpvoted={userUpvotes.includes(app.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
