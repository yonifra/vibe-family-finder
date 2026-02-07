import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TagPill } from '@/components/TagPill';
import { toast } from 'sonner';
import { z } from 'zod';
import { Pencil, Link as LinkIcon, Type, FileText, Check, Loader2 } from 'lucide-react';
import type { App, Tag, TagCategory } from '@/lib/types';

const appSchema = z.object({
  name: z.string().min(2, 'App name must be at least 2 characters').max(50),
  description: z.string().min(20, 'Description must be at least 20 characters').max(500),
  app_url: z.string().url('Please enter a valid URL'),
});

interface EditAppModalProps {
  app: App;
  currentTags: Tag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAppModal({ app, currentTags, open, onOpenChange }: EditAppModalProps) {
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(app.name);
  const [description, setDescription] = useState(app.description);
  const [appUrl, setAppUrl] = useState(app.app_url);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags.map(t => t.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens with new app data
  useEffect(() => {
    if (open) {
      setName(app.name);
      setDescription(app.description);
      setAppUrl(app.app_url);
      setSelectedTags(currentTags.map(t => t.id));
      setErrors({});
    }
  }, [open, app, currentTags]);

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

  const handleSave = async () => {
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

    setSaving(true);

    // Update the app
    const { error: appError } = await supabase
      .from('apps')
      .update({
        name,
        description,
        app_url: appUrl,
      })
      .eq('id', app.id);

    if (appError) {
      console.error('App update error:', appError);
      toast.error(`Failed to update app: ${appError.message}`);
      setSaving(false);
      return;
    }

    // Update tags: delete all existing, then insert new ones
    const { error: deleteError } = await supabase
      .from('app_tags')
      .delete()
      .eq('app_id', app.id);

    if (deleteError) {
      console.error('Failed to remove old tags:', deleteError);
    }

    if (selectedTags.length > 0) {
      const tagInserts = selectedTags.map((tagId) => ({
        app_id: app.id,
        tag_id: tagId,
      }));

      const { error: tagsError } = await supabase.from('app_tags').insert(tagInserts);

      if (tagsError) {
        console.error('Failed to add tags:', tagsError);
      }
    }

    // Invalidate relevant queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['apps'] });
    queryClient.invalidateQueries({ queryKey: ['creator-apps'] });

    setSaving(false);
    toast.success('App updated successfully! ✨');
    onOpenChange(false);
  };

  const categoryLabels: Record<TagCategory, { label: string; description: string }> = {
    age_group: { label: 'Age Group', description: 'Who is this app for?' },
    topic: { label: 'Topic', description: 'What does this app teach or do?' },
    vibe: { label: 'Vibe', description: 'What kind of experience is it?' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit App
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              Basic Info
            </h3>

            <div className="space-y-2">
              <Label htmlFor="edit-name">App Name *</Label>
              <Input
                id="edit-name"
                placeholder="My Awesome Family App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              <p className="text-xs text-muted-foreground text-right">{name.length}/50</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                placeholder="Tell parents what your app does..."
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
              <Label htmlFor="edit-appUrl" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                App URL *
              </Label>
              <Input
                id="edit-appUrl"
                type="url"
                placeholder="https://myapp.com"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
              />
              {errors.app_url && <p className="text-sm text-destructive">{errors.app_url}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Tags
            </h3>

            {errors.tags && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {errors.tags}
              </div>
            )}

            {(['age_group', 'topic', 'vibe'] as TagCategory[]).map((category) => {
              const selected = getSelectedTagsByCategory(category);
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{categoryLabels[category].label} *</h4>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabels[category].description}
                      </p>
                    </div>
                    {selected.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <Check className="w-3 h-3" />
                        {selected.length}
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
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
