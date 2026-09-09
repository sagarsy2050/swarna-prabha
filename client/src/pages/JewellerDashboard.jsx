import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Check } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { PageLoader } from '@/components/Loading';
import { toast } from '@/components/ui/sonner';
import { api } from '@/api/client';
import { formatMoney, formatDate, titleCase } from '@/lib/utils';

const categories = ['ring', 'necklace', 'earrings', 'bracelet', 'pendant'];

export default function JewellerDashboard() {
  const [tab, setTab] = useState('requests');
  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <h1 className="font-display text-4xl sm:text-5xl text-neutral-900 mb-2">Jeweller Studio</h1>
      <p className="text-neutral-500 mb-8">Publish designs, validate concepts, quote, and manage production.</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="designs">Designs</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="validations">Validations</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="designs">
          <DesignsTab />
        </TabsContent>
        <TabsContent value="components">
          <ComponentsTab />
        </TabsContent>
        <TabsContent value="validations">
          <ValidationsTab />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsTab />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useList(fetcher, deps = []) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    fetcher()
      .then((res) => setRows(res.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, deps);
  return { rows, loading, reload };
}

/* ── Requests — drives the backend workflow engine ────────────────────────── */
function RequestsTab() {
  const { rows, loading, reload } = useList(() => api.designRequests.list({ sort: '-createdAt', pageSize: 100 }));
  const act = async (fn, msg) => {
    try {
      await fn();
      if (msg) toast(msg);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  if (loading) return <PageLoader />;
  if (!rows.length) return <Empty>No customer requests yet.</Empty>;
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const concepts = Array.isArray(r.aiConcepts) ? r.aiConcepts : [];
        const c = concepts[r.selectedConcept] || concepts[0];
        return (
          <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-display text-2xl text-neutral-900">{r.designTitle}</h3>
                <span className="text-xs uppercase tracking-wide text-gold-700">{r.category}</span>
                <span className="text-xs text-neutral-400 ml-2">{r.customer?.email}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-neutral-900 text-white">
                {titleCase(r.workflowState || r.status)}
              </span>
            </div>
            {c && (
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 mb-3 text-sm">
                <p className="font-medium text-neutral-800">{c.name}</p>
                <p className="text-neutral-600 mt-1">{c.description}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  {c.materials} · ~{formatMoney(c.estimatedPrice ?? c.estimated_price)} · AI feasibility: {c.feasibility}
                </p>
              </div>
            )}
            {r.customerNotes && <p className="text-xs text-neutral-500 mb-2">Notes: {r.customerNotes}</p>}
            <WorkflowStep request={r} act={act} />
          </div>
        );
      })}
    </div>
  );
}

const DECISIONS = ['APPROVED', 'CHANGES_REQUIRED', 'REJECTED'];

function WorkflowStep({ request: r, act }) {
  const [mc, setMc] = useState({ material: true, stone: true, dimensions: true, structure: true, notes: '' });
  const [comments, setComments] = useState('');
  const [lines, setLines] = useState([{ label: 'Materials & making', quantity: 1, unitPrice: '' }]);
  const [tax, setTax] = useState('');

  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  if (r.workflowState === 'AI_CONCEPT_GENERATED') {
    return (
      <div className="border-t border-neutral-100 pt-4 space-y-3">
        <p className="text-sm font-medium text-neutral-800">Manufacturing check</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {['material', 'stone', 'dimensions', 'structure'].map((k) => (
            <label key={k} className="flex items-center gap-1.5 capitalize">
              <input type="checkbox" checked={mc[k]} onChange={(e) => setMc((m) => ({ ...m, [k]: e.target.checked }))} />
              {k}
            </label>
          ))}
        </div>
        <Input placeholder="Notes (required changes, materials…)" value={mc.notes} onChange={(e) => setMc((m) => ({ ...m, notes: e.target.value }))} />
        <div className="flex flex-wrap gap-2">
          {DECISIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={d === 'APPROVED' ? 'default' : 'outline'}
              className={d === 'REJECTED' ? 'border-rose-300 text-rose-700' : d === 'CHANGES_REQUIRED' ? 'border-amber-300 text-amber-700' : ''}
              onClick={() =>
                act(
                  () =>
                    api.designRequests.manufacturingCheck(r.id, {
                      status: d,
                      materialApproved: mc.material,
                      stoneApproved: mc.stone,
                      dimensionsApproved: mc.dimensions,
                      structureApproved: mc.structure,
                      notes: mc.notes || undefined,
                    }),
                  `Manufacturing check: ${titleCase(d)}`,
                )
              }
            >
              {titleCase(d)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (r.workflowState === 'MANUFACTURING_CHECK') {
    return (
      <div className="border-t border-neutral-100 pt-4 space-y-3">
        <p className="text-sm font-medium text-neutral-800">Design / commercial review</p>
        <Input placeholder="Comments to the customer" value={comments} onChange={(e) => setComments(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {DECISIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={d === 'APPROVED' ? 'default' : 'outline'}
              className={d === 'REJECTED' ? 'border-rose-300 text-rose-700' : d === 'CHANGES_REQUIRED' ? 'border-amber-300 text-amber-700' : ''}
              onClick={() => act(() => api.designRequests.review(r.id, { decision: d, comments: comments || undefined }), `Review: ${titleCase(d)}`)}
            >
              {titleCase(d)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (r.workflowState === 'JEWELLER_REVIEW') {
    return (
      <div className="border-t border-neutral-100 pt-4 space-y-3">
        <p className="text-sm font-medium text-neutral-800">Create quotation</p>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr,70px,110px] gap-2">
            <Input value={l.label} onChange={(e) => setLine(i, 'label', e.target.value)} placeholder="Line item" />
            <Input type="number" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
            <Input type="number" value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} placeholder="$ each" />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="button" className="text-xs text-gold-700" onClick={() => setLines((ls) => [...ls, { label: '', quantity: 1, unitPrice: '' }])}>
            + line
          </button>
          <Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="tax rate e.g. 0.05" className="h-8 w-40" />
        </div>
        <Button
          size="sm"
          className="bg-neutral-900 hover:bg-neutral-800 text-white"
          onClick={() =>
            act(
              () =>
                api.designRequests.createQuotation(r.id, {
                  lineItems: lines
                    .filter((l) => l.label && l.unitPrice)
                    .map((l) => ({ label: l.label, quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) })),
                  taxRate: tax ? Number(tax) : undefined,
                }),
              'Quotation sent to the customer.',
            )
          }
        >
          <Check className="w-4 h-4 mr-1.5" /> Send quotation
        </Button>
      </div>
    );
  }

  if (r.workflowState === 'APPOINTMENT_SCHEDULED') {
    return (
      <div className="border-t border-neutral-100 pt-4">
        <Button
          size="sm"
          className="bg-gold-500 hover:bg-gold-400 text-neutral-900"
          onClick={() => act(() => api.designRequests.completeHandover(r.id, { handoverVerifiedBy: 'studio' }), 'Handover completed.')}
        >
          Complete handover
        </Button>
        <p className="text-xs text-neutral-400 mt-2">
          Requires the order to be <em>ready_for_handover</em> — advance it in the Orders tab first.
        </p>
      </div>
    );
  }

  return null;
}

/* ── Designs ──────────────────────────────────────────────────────────────── */
const CATEGORY_CODES = ['NOSE_JEWELLERY', 'RING', 'EARRING', 'NECK_CHAIN', 'NECKLACE', 'HARAM', 'JEWELLERY_SET'];
const emptyDesign = {
  title: '', category: 'ring', categoryCode: 'RING', description: '', imageUrl: '', materials: '',
  basePrice: '', customizableParts: '', styles: '', occasions: '', suitableFaceShapes: '',
  suitableNoseSizes: '', suitableEarSizes: '', suitableNeckLengths: '',
};
const csv = (s) => s.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
const csvStyles = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function DesignsTab() {
  const { rows, loading, reload } = useList(() => api.designs.list({ all: 1, pageSize: 100, sort: '-createdAt' }));
  const [form, setForm] = useState(emptyDesign);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    if (!form.title || !form.basePrice) return toast.error('Title and base price are required.');
    setSaving(true);
    try {
      await api.designs.create({
        title: form.title,
        category: form.category,
        categoryCode: form.categoryCode,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        materials: form.materials || undefined,
        basePrice: Number(form.basePrice),
        customizableParts: form.customizableParts || undefined,
        isPublished: true,
        styles: csvStyles(form.styles),
        occasions: csvStyles(form.occasions),
        suitableFaceShapes: csv(form.suitableFaceShapes),
        suitableNoseSizes: csv(form.suitableNoseSizes),
        suitableEarSizes: csv(form.suitableEarSizes),
        suitableNeckLengths: csv(form.suitableNeckLengths),
      });
      setForm(emptyDesign);
      toast('Design published.');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={create} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 h-fit">
        <h2 className="font-display text-2xl text-neutral-900 flex items-center gap-2">
          <Plus className="w-5 h-5" /> New design
        </h2>
        <Field label="Title"><Input value={form.title} onChange={set('title')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Catalogue category">
            <select value={form.category} onChange={set('category')} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm">
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Recommendation category">
            <select value={form.categoryCode} onChange={set('categoryCode')} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm">
              {CATEGORY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Base price ($)"><Input type="number" value={form.basePrice} onChange={set('basePrice')} /></Field>
        <Field label="Image URL"><Input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></Field>
        <Field label="Materials"><Input value={form.materials} onChange={set('materials')} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description} onChange={set('description')} /></Field>
        <Field label="Customizable parts"><Input value={form.customizableParts} onChange={set('customizableParts')} /></Field>
        <p className="text-xs text-neutral-400 pt-1">Recommendation matching (comma-separated; blank = matches everyone)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Styles"><Input value={form.styles} onChange={set('styles')} placeholder="Traditional, Bridal" /></Field>
          <Field label="Occasions"><Input value={form.occasions} onChange={set('occasions')} placeholder="Wedding, Festive" /></Field>
          <Field label="Face shapes"><Input value={form.suitableFaceShapes} onChange={set('suitableFaceShapes')} placeholder="OVAL, HEART" /></Field>
          <Field label="Nose sizes"><Input value={form.suitableNoseSizes} onChange={set('suitableNoseSizes')} placeholder="SMALL, MEDIUM" /></Field>
          <Field label="Ear sizes"><Input value={form.suitableEarSizes} onChange={set('suitableEarSizes')} placeholder="SMALL, MEDIUM" /></Field>
          <Field label="Neck lengths"><Input value={form.suitableNeckLengths} onChange={set('suitableNeckLengths')} placeholder="MEDIUM, LONG" /></Field>
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-gold-500 hover:bg-gold-400 text-neutral-900">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Publish design
        </Button>
        <BulkImport onDone={reload} />
      </form>

      <div className="grid sm:grid-cols-2 gap-5 content-start">
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <Empty>No designs yet.</Empty>
        ) : (
          rows.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="aspect-[4/3] bg-neutral-100">
                {d.imageUrl ? <Image src={d.imageUrl} alt={d.title} className="w-full h-full" fittingType="fill" /> : null}
              </div>
              <div className="p-4">
                <h3 className="font-display text-xl text-neutral-900">{d.title}</h3>
                <p className="text-sm text-neutral-500">{formatMoney(d.basePrice)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Components ───────────────────────────────────────────────────────────── */
function ComponentsTab() {
  const { rows, loading, reload } = useList(() => api.components.list({ pageSize: 100 }));
  const [form, setForm] = useState({ name: '', type: '', priceModifier: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const create = async (e) => {
    e.preventDefault();
    if (!form.name || !form.type) return toast.error('Name and type required.');
    try {
      await api.components.create({ ...form, priceModifier: Number(form.priceModifier || 0) });
      setForm({ name: '', type: '', priceModifier: '' });
      toast('Component added.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={create} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 h-fit">
        <h2 className="font-display text-2xl text-neutral-900">New component</h2>
        <Field label="Name"><Input value={form.name} onChange={set('name')} /></Field>
        <Field label="Type"><Input value={form.type} onChange={set('type')} placeholder="stone / band / finish" /></Field>
        <Field label="Price modifier ($)"><Input type="number" value={form.priceModifier} onChange={set('priceModifier')} /></Field>
        <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 text-neutral-900">Add component</Button>
      </form>
      <div className="bg-white rounded-2xl border border-neutral-200 p-2">
        {loading ? (
          <PageLoader />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">+ $</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-neutral-500">{c.type}</TableCell>
                  <TableCell className="text-right">{formatMoney(c.priceModifier)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

/* ── Validations ─────────────────────────────────────────────────────────── */
function ValidationsTab() {
  const { rows, loading, reload } = useList(() => api.aiDesigns.list({ pageSize: 50, sort: '-createdAt' }));
  const validate = async (aiResultId, conceptIndex, verdict) => {
    try {
      await api.designValidations.create({ aiResultId, conceptIndex, verdict });
      toast(`Concept marked ${verdict}.`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  if (loading) return <PageLoader />;
  const withResults = rows.filter((r) => r.result?.concepts?.length);
  if (!withResults.length) return <Empty>No AI concept sets awaiting validation.</Empty>;
  return (
    <div className="space-y-5">
      {withResults.map((r) => (
        <div key={r.id} className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl text-neutral-900">{r.inputs?.design_title || 'AI request'}</h3>
            <span className="text-xs text-neutral-400">{r.customer?.email} · {formatDate(r.createdAt)}</span>
          </div>
          <div className="space-y-3">
            {r.result.concepts.map((c, i) => (
              <div key={i} className="border border-neutral-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-800">{c.name}</p>
                  <span className="text-xs text-neutral-500">AI: {c.feasibility}</span>
                </div>
                <p className="text-sm text-neutral-600 mt-1">{c.description}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => validate(r.result.id, i, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-500">
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => validate(r.result.id, i, 'NEEDS_MODIFICATION')} className="border-amber-300 text-amber-700">
                    Needs mod
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => validate(r.result.id, i, 'REJECTED')} className="border-rose-300 text-rose-700">
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Orders / production / QC / delivery ─────────────────────────────────── */
function OrdersTab() {
  const { rows, loading, reload } = useList(() => api.orders.list({ pageSize: 100, sort: '-createdAt' }));
  const act = async (fn, label) => {
    try {
      await fn();
      toast(label);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  if (loading) return <PageLoader />;
  if (!rows.length) return <Empty>No orders yet.</Empty>;
  return (
    <div className="space-y-4">
      {rows.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-neutral-400">#{o.id.slice(-8)} · {o.customer?.email}</p>
              <p className="font-display text-xl text-neutral-900 mt-1">{formatMoney(o.total, o.currency)}</p>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {(o.payments || []).some((p) => p.status === 'pending') && (
              <Button size="sm" onClick={() => act(() => api.payments.confirm(o.payments.find((p) => p.status === 'pending').id), 'Payment confirmed.')}>
                Confirm payment
              </Button>
            )}
            {o.status === 'paid' && (
              <Button size="sm" variant="outline" onClick={() => act(() => api.orders.updateProduction(o.id, { stage: 'casting' }), 'Production started.')}>
                Start production
              </Button>
            )}
            {o.status === 'in_production' && (
              <Button size="sm" variant="outline" onClick={() => act(() => api.orders.setStatus(o.id, 'quality_check'), 'Moved to QC.')}>
                Send to QC
              </Button>
            )}
            {o.status === 'quality_check' && (
              <Button size="sm" onClick={() => act(() => api.qualityChecks.create({ orderId: o.id, passed: true }), 'QC passed.')}>
                Pass QC
              </Button>
            )}
            {o.status === 'ready_for_handover' && (
              <Button
                size="sm"
                className="bg-gold-500 hover:bg-gold-400 text-neutral-900"
                onClick={() =>
                  act(
                    () => api.orders.updateDelivery(o.id, { method: 'in_person_handover', status: 'handed_over', handoverVerifiedBy: 'studio' }),
                    'Handover completed.',
                  )
                }
              >
                Complete handover
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Inventory ───────────────────────────────────────────────────────────── */
function InventoryTab() {
  const { rows, loading, reload } = useList(() => api.inventory.list({ pageSize: 100 }));
  const [form, setForm] = useState({ sku: '', name: '', quantity: '', unitCost: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const create = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name) return toast.error('SKU and name required.');
    try {
      await api.inventory.create({
        sku: form.sku,
        name: form.name,
        quantity: Number(form.quantity || 0),
        unitCost: Number(form.unitCost || 0),
      });
      setForm({ sku: '', name: '', quantity: '', unitCost: '' });
      toast('Item added.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={create} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 h-fit">
        <h2 className="font-display text-2xl text-neutral-900">New inventory item</h2>
        <Field label="SKU"><Input value={form.sku} onChange={set('sku')} /></Field>
        <Field label="Name"><Input value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity"><Input type="number" value={form.quantity} onChange={set('quantity')} /></Field>
          <Field label="Unit cost ($)"><Input type="number" value={form.unitCost} onChange={set('unitCost')} /></Field>
        </div>
        <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 text-neutral-900">Add item</Button>
      </form>
      <div className="bg-white rounded-2xl border border-neutral-200 p-2">
        {loading ? (
          <PageLoader />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                  <TableCell>{it.name}</TableCell>
                  <TableCell className={`text-right ${it.quantity <= it.reorderLevel ? 'text-rose-600' : ''}`}>
                    {it.quantity}
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

function BulkImport({ onDone }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    let items;
    try {
      const parsed = JSON.parse(text);
      items = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(items) || !items.length) throw new Error('empty');
    } catch {
      return toast.error('Paste a JSON array of design records (or { "items": [...] }).');
    }
    setBusy(true);
    try {
      const { data } = await api.designs.import(items);
      toast(`Import: ${data.created} created, ${data.updated} updated, ${data.skipped} skipped.`);
      if (data.errors?.length) toast.error(`${data.errors.length} row error(s) — see console.`);
      if (data.errors?.length) console.warn('catalog import errors', data.errors);
      setText('');
      onDone?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-t border-neutral-100 pt-3">
      <button type="button" className="text-xs text-gold-700" onClick={() => setOpen((v) => !v)}>
        {open ? '− ' : '+ '}Bulk import (JSON) — for large catalogues use `npm run catalog:import`
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='[{"externalId":"SKU-1","title":"Halo Ring","categoryCode":"RING","basePrice":2400,"styles":["Bridal"]}]'
            className="font-mono text-xs"
          />
          <Button type="button" size="sm" disabled={busy} onClick={run} variant="outline">
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Import batch (≤ 500)
          </Button>
          <p className="text-[11px] text-neutral-400">
            Idempotent by <code>externalId</code>. Missing images stay empty — fill with{' '}
            <code>catalog:generate-images</code> (needs a local image model) or upload per design.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Materials (configurable catalogue for recommendations + raw estimates) ── */
function MaterialsTab() {
  const { rows, loading, reload } = useList(() => api.materials.list({ pageSize: 100 }));
  const [form, setForm] = useState({ code: '', name: '', type: 'metal', priceMultiplier: '1.0', addOnPrice: '0' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const create = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) return toast.error('Code and name required.');
    try {
      await api.materials.create({
        code: form.code,
        name: form.name,
        type: form.type,
        priceMultiplier: Number(form.priceMultiplier) || 1,
        addOnPrice: Number(form.addOnPrice) || 0,
      });
      setForm({ code: '', name: '', type: 'metal', priceMultiplier: '1.0', addOnPrice: '0' });
      toast('Material added.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={create} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 h-fit">
        <h2 className="font-display text-2xl text-neutral-900">New material / stone</h2>
        <Field label="Code"><Input value={form.code} onChange={set('code')} placeholder="18K_ROSE_GOLD" /></Field>
        <Field label="Name"><Input value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
            <select value={form.type} onChange={set('type')} className="w-full h-9 rounded-md border border-neutral-200 px-2 text-sm">
              {['metal', 'stone', 'other'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="× multiplier"><Input type="number" step="0.01" value={form.priceMultiplier} onChange={set('priceMultiplier')} /></Field>
          <Field label="+ add-on"><Input type="number" value={form.addOnPrice} onChange={set('addOnPrice')} /></Field>
        </div>
        <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 text-neutral-900">Add material</Button>
        <p className="text-xs text-neutral-400">
          Used by material suggestions and raw price estimates. Estimates are never final quotations.
        </p>
      </form>
      <div className="bg-white rounded-2xl border border-neutral-200 p-2">
        {loading ? <PageLoader /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead className="text-right">×</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell className="text-neutral-500">{m.type}</TableCell>
                  <TableCell className="text-right">{m.priceMultiplier}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

/* ── small shared bits ──────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
function Empty({ children }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200 text-neutral-500 col-span-full">
      {children}
    </div>
  );
}
