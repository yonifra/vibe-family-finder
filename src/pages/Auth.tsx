import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';
import { z } from 'zod';
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error(`Failed to sign in with ${provider}: ${error.message}`);
      }
    } catch (err) {
      toast.error(`An error occurred while signing in with ${provider}`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email || !z.string().email().safeParse(email).success) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=signin`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox. 📬');
      setMode('signin');
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (mode === 'signup') {
        signUpSchema.parse({ email, password, username });
      } else {
        signInSchema.parse({ email, password });
      }
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

    setSubmitting(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password, username);
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Try signing in instead.');
        } else if (error.message.includes('username')) {
          setErrors({ username: 'This username is already taken' });
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Check your email to confirm your account! 📬');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email before signing in.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back! 👋');
        navigate('/');
      }
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="card-elevated p-8 rounded-2xl shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {mode === 'forgot' 
                  ? 'Reset Password' 
                  : mode === 'signin' 
                    ? 'Welcome Back!' 
                    : 'Join the Sandbox'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === 'forgot'
                  ? 'Enter your email to receive a reset link'
                  : mode === 'signin'
                    ? 'Sign in to upvote apps and share feedback'
                    : 'Create an account to submit your apps'}
              </p>
            </div>

            {/* Forgot Password Form */}
            {mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <>
                {/* Social Login Buttons */}
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-3 h-11"
                    onClick={() => handleSocialLogin('google')}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === 'google' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-3 h-11"
                    onClick={() => handleSocialLogin('apple')}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === 'apple' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    )}
                    Continue with Apple
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="coolparent42"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10"
                          autoComplete="username"
                        />
                      </div>
                      {errors.username && (
                        <p className="text-sm text-destructive">{errors.username}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {mode === 'signin' ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {mode === 'signin' ? (
                      <>
                        Don't have an account?{' '}
                        <span className="font-semibold text-primary">Sign up</span>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <span className="font-semibold text-primary">Sign in</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
