import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { eventApi } from '../../api/eventApi';
import PlanSelector from '../../components/PlanSelector';
import FilterSelector from '../../components/FilterSelector';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { PLANS, formatBRL } from '../../utils/plans';

const EVENT_TYPES = [
  { id: 'casamento',   label: 'Casamento',    icon: '💍' },
  { id: 'festa',       label: 'Festa',         icon: '🎉' },
  { id: 'aniversario', label: 'Aniversário',   icon: '🎂' },
  { id: 'corporativo', label: 'Corporativo',   icon: '💼' },
  { id: 'viagem',      label: 'Viagem',        icon: '✈️' },
  { id: 'outro',       label: 'Outro',         icon: '📷' },
];

const PHOTO_LIMITS = [
  { value: 5,  label: '5 fotos' },
  { value: 10, label: '10 fotos' },
  { value: 15, label: '15 fotos' },
  { value: 20, label: '20 fotos' },
  { value: 30, label: '30 fotos' },
  { value: 0,  label: 'Ilimitado' },
];

const STEPS = ['Informações', 'Configurações', 'Plano', 'Confirmar'];

const defaultForm = {
  name: '',
  type: 'casamento',
  startsAt: '',
  endsAt: '',
  revealAt: '',
  photoLimitPerGuest: 10,
  defaultFilter: 'nenhum',
  planId: 'free',
};

export default function NewEvent() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        revealAt: form.revealAt || form.endsAt || null,
      };
      const data = await eventApi.create(payload);
      if (data.requiresPayment) {
        toast('Evento criado! Conclua o pagamento para ativar.', { icon: '💳' });
      } else {
        toast.success('Evento criado e ativado!');
      }
      navigate(`/events/${data.event.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao criar evento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-white/50 hover:text-white">
            ← Voltar
          </button>
          <span className="font-serif text-lg">
            ERA <span className="text-gold">UMA VEZ</span>
          </span>
          <span />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Progress */}
        <div className="mb-10">
          <div className="mb-3 flex justify-between text-xs text-white/40">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'text-gold' : ''}>{s}</span>
            ))}
          </div>
          <div className="h-1 rounded-full bg-white/10">
            <div
              className="h-1 rounded-full bg-gold transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Informações básicas */}
        {step === 0 && (
          <div className="space-y-8">
            <div>
              <h1 className="font-serif text-3xl">Qual é o nome do evento?</h1>
              <p className="mt-2 text-sm text-white/50">Esse nome aparecerá para os seus convidados.</p>
            </div>
            <Input
              placeholder="Ex: Casamento da Ana & Pedro"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
            />
            <div>
              <p className="mb-3 text-sm text-white/50">Tipo do evento</p>
              <div className="grid grid-cols-3 gap-3">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => set('type', t.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border py-4 text-sm transition ${
                      form.type === t.id
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Configurações */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl">Configurações do evento</h1>
              <p className="mt-2 text-sm text-white/50">Defina as datas e limites do álbum.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Início do evento</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Encerramento (para de aceitar fotos)</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => set('endsAt', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm text-white/60">Revelação (quando as fotos aparecem)</label>
                <input
                  type="datetime-local"
                  value={form.revealAt}
                  onChange={(e) => set('revealAt', e.target.value)}
                  className="input-field"
                  placeholder="Deixe vazio para revelar no encerramento"
                />
                <p className="mt-1 text-xs text-white/30">Deixe vazio para revelar automaticamente no encerramento.</p>
              </div>
            </div>

            {/* Limite de fotos */}
            <div>
              <label className="mb-3 block text-sm text-white/60">Fotos por convidado</label>
              <div className="flex flex-wrap gap-2">
                {PHOTO_LIMITS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => set('photoLimitPerGuest', l.value)}
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      form.photoLimitPerGuest === l.value
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro padrão */}
            <div>
              <label className="mb-3 block text-sm text-white/60">Filtro fotográfico padrão</label>
              <FilterSelector value={form.defaultFilter} onChange={(v) => set('defaultFilter', v)} />
            </div>
          </div>
        )}

        {/* Step 3 — Plano */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="font-serif text-3xl">Escolha o plano</h1>
              <p className="mt-2 text-sm text-white/50">Quantos convidados você espera?</p>
            </div>
            <PlanSelector value={form.planId} onChange={(v) => set('planId', v)} />
          </div>
        )}

        {/* Step 4 — Confirmação */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="font-serif text-3xl">Confirmar e criar</h1>
              <p className="mt-2 text-sm text-white/50">Revise as informações antes de continuar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface p-6 space-y-4 text-sm">
              <Row label="Nome" value={form.name} />
              <Row label="Tipo" value={EVENT_TYPES.find((t) => t.id === form.type)?.label} />
              <Row label="Início" value={form.startsAt ? new Date(form.startsAt).toLocaleString('pt-BR') : '—'} />
              <Row label="Encerramento" value={form.endsAt ? new Date(form.endsAt).toLocaleString('pt-BR') : '—'} />
              <Row label="Revelação" value={form.revealAt ? new Date(form.revealAt).toLocaleString('pt-BR') : 'No encerramento'} />
              <Row label="Fotos/convidado" value={form.photoLimitPerGuest === 0 ? 'Ilimitado' : form.photoLimitPerGuest} />
              <Row label="Filtro" value={form.defaultFilter} />
              <Row
                label="Plano"
                value={(() => {
                  const plan = PLANS.find((p) => p.id === form.planId);
                  return plan ? `${plan.label} — ${formatBRL(plan.priceCents)}` : form.planId;
                })()}
              />
            </div>
          </div>
        )}

        {/* Navegação */}
        <div className="mt-10 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !form.name.trim()}
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={submit} loading={loading} disabled={loading}>
              {loading ? 'Criando...' : 'Criar evento'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
