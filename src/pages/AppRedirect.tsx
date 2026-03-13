import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toAppSlug } from '@/lib/appRedirects';

// TODO: REMOVE MOCK — temporary until RLS access is restored
const MOCK_REDIRECTS: Record<string, string> = {
  'toddler-plate-builder': 'https://toddler-plate-builder-vjdjnh.sticklight.app/',
  'superstar-trivia': 'https://superstar-trivia.sticklight.app/',
};

type Status = 'loading' | 'redirecting' | 'not-found';

export default function AppRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!slug) {
      setStatus('not-found');
      return;
    }

    // TODO: REMOVE MOCK — check mock redirects first
    if (MOCK_REDIRECTS[slug]) {
      setStatus('redirecting');
      window.location.replace(MOCK_REDIRECTS[slug]);
      return;
    }

    supabase
      .from('apps')
      .select('name, app_url')
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('not-found');
          return;
        }

        const match = data.find((app) => toAppSlug(app.name) === slug.toLowerCase());

        if (match) {
          setStatus('redirecting');
          window.location.replace(match.app_url);
        } else {
          setStatus('not-found');
        }
      });
  }, [slug]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <h1 className="text-2xl font-bold mb-2">App not found</h1>
        <p className="text-muted-foreground mb-4">
          No app is mapped to <code className="font-mono">/{slug}</code>.
        </p>
        <a href="/" className="text-secondary underline">
          Back to FamilyVibe Labs
        </a>
      </div>
    </div>
  );
}
