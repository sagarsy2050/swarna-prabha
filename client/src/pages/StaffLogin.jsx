import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/lib/AuthContext';
import { safeReturnTo } from '@/lib/authReturnTo';

/**
 * Separate sign-in for shop (jeweller) and admin accounts. Same credentials API
 * as customers, but this entrance has no self-registration — staff accounts are
 * provisioned by an admin — and it routes into the relevant dashboard.
 */
export default function StaffLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      if (u.role === 'ADMIN') {
        navigate(returnTo.startsWith('/admin') || returnTo.startsWith('/jeweller') ? returnTo : '/admin', { replace: true });
      } else if (u.role === 'JEWELLER') {
        navigate(returnTo.startsWith('/jeweller') ? returnTo : '/jeweller', { replace: true });
      } else {
        await logout();
        setError('This sign-in is for shops and administrators. Customers sign in from the checkout.');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Shop & Admin sign in"
      subtitle="For jewellers managing a shop and administrators"
      footer={
        <>
          Shopping instead?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Customer sign in
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@shop.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <p className="mt-6 text-xs text-center text-muted-foreground">
        No account? A shop account is created for you by an administrator.
      </p>
    </AuthLayout>
  );
}
