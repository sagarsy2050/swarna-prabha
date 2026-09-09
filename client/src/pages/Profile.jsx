import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

export default function Profile() {
  const { user, refreshMe, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [studioName, setStudioName] = useState(user?.jewellerProfile?.studioName || '');
  const [bio, setBio] = useState(user?.jewellerProfile?.bio || '');
  const [address, setAddress] = useState(user?.customerProfile?.address || '');
  const [saving, setSaving] = useState(false);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { fullName, phone };
      if (user.role === 'JEWELLER') body.jewellerProfile = { studioName, bio };
      if (user.role === 'CUSTOMER') body.customerProfile = { address };
      await api.auth.updateProfile(body);
      await refreshMe();
      toast('Profile saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (next.length < 8) return toast.error('New password must be at least 8 characters');
    setPwSaving(true);
    try {
      await api.auth.changePassword({ currentPassword: cur, newPassword: next });
      toast('Password changed — please sign in again.');
      await logout();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20 space-y-8">
      <div>
        <h1 className="font-display text-4xl text-neutral-900 mb-1">Your profile</h1>
        <p className="text-neutral-500">
          {user?.email} · <span className="capitalize">{user?.role?.toLowerCase()}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {user?.role === 'JEWELLER' && (
              <>
                <div>
                  <Label className="mb-1.5 block">Studio name</Label>
                  <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Bio</Label>
                  <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </>
            )}
            {user?.role === 'CUSTOMER' && (
              <div>
                <Label className="mb-1.5 block">Address</Label>
                <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePw} className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Current password</Label>
              <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required />
            </div>
            <div>
              <Label className="mb-1.5 block">New password</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <Button type="submit" variant="outline" disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
