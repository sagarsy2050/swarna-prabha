import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { PageLoader } from '@/components/Loading';
import { toast } from '@/components/ui/sonner';
import { api } from '@/api/client';
import { formatMoney, formatDate } from '@/lib/utils';

const roles = ['CUSTOMER', 'JEWELLER', 'ADMIN'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <h1 className="font-display text-4xl sm:text-5xl text-neutral-900 mb-2">Admin</h1>
      <p className="text-neutral-500 mb-8">Manage users and roles, and monitor orders across the platform.</p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="orders">All orders</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="orders">
          <AllOrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', role: 'JEWELLER', fullName: '' });

  const load = () => {
    setLoading(true);
    api.users
      .list({ pageSize: 100, sort: '-createdAt' })
      .then((res) => setRows(res.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.email || form.password.length < 8) return toast.error('Email and 8+ char password required.');
    try {
      await api.users.create(form);
      setForm({ email: '', password: '', role: 'JEWELLER', fullName: '' });
      toast('User created.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setRole = async (id, role) => {
    try {
      await api.users.setRole(id, role);
      toast('Role updated.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <form onSubmit={create} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 h-fit">
        <h2 className="font-display text-2xl text-neutral-900">Create user</h2>
        <div>
          <Label className="mb-1.5 block">Full name</Label>
          <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div>
          <Label className="mb-1.5 block">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <Label className="mb-1.5 block">Password</Label>
          <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <Label className="mb-1.5 block">Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 text-neutral-900">
          Create user
        </Button>
      </form>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-2">
        {loading ? (
          <PageLoader />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm text-neutral-500">{u.fullName || '—'}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v)}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function AllOrdersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.orders
      .list({ pageSize: 100, sort: '-createdAt' })
      .then((res) => setRows(res.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <PageLoader />;
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs">#{o.id.slice(-8)}</TableCell>
              <TableCell className="text-sm">{o.customer?.email}</TableCell>
              <TableCell>{formatMoney(o.total, o.currency)}</TableCell>
              <TableCell>
                <StatusBadge status={o.status} />
              </TableCell>
              <TableCell className="text-sm text-neutral-500">{formatDate(o.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
