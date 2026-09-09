import React, { useEffect, useState } from 'react';
import { CalendarPlus, CalendarCheck2, Clock, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import { PageLoader, ErrorState } from '@/components/Loading';
import { toast } from '@/components/ui/sonner';
import { api } from '@/api/client';
import { formatDate } from '@/lib/utils';

const slots = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];
const types = [
  { value: 'consultation', label: 'Design consultation' },
  { value: 'verification', label: 'Piece verification' },
  { value: 'handover', label: 'Secure handover' },
];

export default function Appointments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(slots[0]);
  const [type, setType] = useState('consultation');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api.appointments
      .list({ mine: 'true', sort: 'scheduledDate', pageSize: 50 })
      .then((res) => setItems(res.data || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const book = async (e) => {
    e.preventDefault();
    if (!date) return toast.error('Pick a date.');
    setSaving(true);
    try {
      await api.appointments.create({ scheduledDate: date, timeSlot: slot, type, notes });
      setNotes('');
      toast('Appointment booked.');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    try {
      await api.appointments.update(id, { status: 'cancelled' });
      load();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <h1 className="font-display text-4xl sm:text-5xl text-neutral-900 mb-2">Appointments</h1>
      <p className="text-neutral-500 mb-10">
        High-value pieces are finalized in person — book a consultation, verification, or secure handover.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <form onSubmit={book} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 h-fit">
          <h2 className="font-display text-2xl text-neutral-900 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" /> Book a visit
          </h2>
          <div>
            <Label className="mb-1.5 block">Visit type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Time slot</Label>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    slot === s ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any details for the jeweller" />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-gold-500 hover:bg-gold-400 text-neutral-900">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
            Confirm appointment
          </Button>
        </form>

        <div className="space-y-4">
          {items.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200 text-neutral-500">
              <CalendarCheck2 className="w-8 h-8 mx-auto mb-3 text-neutral-300" />
              No appointments booked yet.
            </div>
          )}
          {items.map((a) => {
            const t = types.find((x) => x.value === a.type);
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl text-neutral-900">{formatDate(a.scheduledDate)}</p>
                    <p className="text-sm text-neutral-500 flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5" /> {a.timeSlot} · {t?.label || a.type}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {a.notes && <p className="text-xs text-neutral-500 mt-3">{a.notes}</p>}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-3">
                  <MapPin className="w-3.5 h-3.5" /> Atelier visit · address confirmed on booking
                </div>
                {a.status === 'scheduled' && (
                  <Button size="sm" variant="outline" onClick={() => cancel(a.id)} className="mt-3 border-neutral-300 text-neutral-500">
                    Cancel
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
