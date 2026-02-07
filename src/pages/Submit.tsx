import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TagPill } from '@/components/TagPill';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { Rocket, Link as LinkIcon, Type, FileText, Check } from 'lucide-react';
import type { Tag, TagCategory } from '@/lib/types';

const appSchema = z.object({
  name: z.string().min(2, 'App name must be at least 2 characters').max(50),
  description: z.string().min(20, 'Description must be at least 20 characters').max(500),
  app_url: z.string().url('Please enter a valid URL'),
});

export default function Submit() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?mode=signup');
    }
  }, [user, loading, navigate]);

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

  const getSelectedTagsByCategory = (category: TagCategory) => {
    return selectedTags.filter((id) => {
      const tag = tags.find((t) => t.id === id);
      return tag?.category === category;
    });
  };

  const validateTags = () => {
    const ageGroupTags = getSelectedTagsByCategory('age_group');
    const topicTags = getSelectedTagsByCategory('topic');
    const vibeTags = getSelectedTagsByCategory('vibe');

    const tagErrors: string[] = [];
    if (ageGroupTags.length === 0) tagErrors.push('Select at least one Age Group');
    if (topicTags.length === 0) tagErrors.push('Select at least one Topic');
    if (vibeTags.length === 0) tagErrors.push('Select at least one Vibe');

    return tagErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    try {
      appSchema.parse({ name, description, app_url: appUrl });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    // Validate tags
    const tagErrors = validateTags();
    if (tagErrors.length > 0) {
      setErrors({ tags: tagErrors.join('. ') });
      return;
    }

    if (!user) {
      toast.error('Please sign in to submit an app');
      return;
    }

    setSubmitting(true);

    // Update profile to mark as creator if not already
    if (profile && !profile.is_creator) {
      await supabase
        .from('profiles')
        .update({ is_creator: true })
        .eq('id', user.id);
    }

    // Create the app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        creator_id: user.id,
        name,
        description,
        app_url: appUrl,
        tier: 'sandbox',
      })
      .select()
      .single();

    if (appError) {
      toast.error('Failed to submit app. Please try again.');
      setSubmitting(false);
      return;
    }

    // Add tags
    const tagInserts = selectedTags.map((tagId) => ({
      app_id: app.id,
      tag_id: tagId,
    }));

    const { error: tagsError } = await supabase.from('app_tags').insert(tagInserts);

    if (tagsError) {
      console.error('Failed to add tags:', tagsError);
    }

    setSubmitting(false);
    toast.success('App submitted to the Sandbox! 🎉');
    navigate('/');
  };

  const categoryLabels: Record<TagCategory, { label: string; description: string }> = {
    age_group: { label: 'Age Group', description: 'Who is this app for?' },
    topic: { label: 'Topic', description: 'What does this app teach or do?' },
    vibe: { label: 'Vibe', description: 'What kind of experience is it?' },
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-sandbox flex items-center justify-center">
            <Rocket className="w-7 h-7 text-sandbox-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Submit Your App</h1>
          <p className="text-muted-foreground">
            Share your creation with families everywhere. All apps start in the Sandbox!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="card-elevated p-6 space-y-6">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" />
              Basic Info
            </h2>

            <div className="space-y-2">
              <Label htmlFor="name">App Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Family App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              <p className="text-xs text-muted-foreground text-right">{name.length}/50</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Tell parents what your app does and why kids will love it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                App URL *
              </Label>
              <Input
                id="appUrl"
                type="url"
                placeholder="https://myapp.com"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
              />
              {errors.app_url && <p className="text-sm text-destructive">{errors.app_url}</p>}
            </div>
          </div>

          <div className="card-elevated p-6 space-y-6">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Tags (Required)
            </h2>
            <p className="text-sm text-muted-foreground">
              Select at least one tag from each category to help parents discover your app.
            </p>

            {errors.tags && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {errors.tags}
              </div>
            )}

            {(['age_group', 'topic', 'vibe'] as TagCategory[]).map((category) => {
              const selected = getSelectedTagsByCategory(category);
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{categoryLabels[category].label} *</h3>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabels[category].description}
                      </p>
                    </div>
                    {selected.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <Check className="w-3 h-3" />
                        {selected.length} selected
                      </span>
                    )}
                  </div>
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
              );
            })}
          </div>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
            {submitting ? (
              <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Submit to Sandbox
              </>
            )}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
