import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Check, Heart, PartyPopper, Cake, Briefcase, Plane, Camera as CameraIcon, Aperture,
} from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { eventApi } from '../../api/eventApi';
import PlanSelector from '../../components/PlanSelector';
import FilterSelector from '../../components/FilterSelector';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { PLANS, formatBRL } from '../../utils/plans';

const EVENT_TYPES = [
  { id: 'casamento', label: 'Casamento', Icon: Heart },
  { id: 'festa', label: 'Festa', Icon: PartyPopper },
  { id: 'aniversario', label: 'Aniversário', Icon: Cake },
  { id: 'corporativo', label: 'Corporativo', Icon: Briefcase },
  { id: 'viagem', label: 'Viagem', Icon: Plane },
  { id: 'outro', label: 'Outro', Icon: CameraIcon },
];

const PHOTO_LIMITS = [
  { value: 5, label: '5 fotos' },
  { value: 10, label: '10 fotos' },
  { value: 15, label: '15 fotos' },
  { value: 20, label: '20 fotos' },
  { value: 30, label: '30 fotos' },
  { value: 0, label: 'Ilimitado' },
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

const stepAnim = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
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
        // Plano pago: cria a cobrança e leva ao checkout
        toast('Evento criado! Vamos ao pagamento…', { icon: '💳' });
        try {
          const co = await paymentApi.checkout(data.event.id, form.planId);
          if (co.free) {
            navigate(`/events/${data.event.id}`);
          } else if (co.provider === 'asaas' && co.checkoutUrl) {
            // Página de pagamento hospedada do Asaas (Pix/boleto/cartão)
            window.location.href = co.checkoutUrl;
          } else {
            navigate(`/events/${data.event.id}/checkout?payment=${co.paymentId}`);
          }
          return;
        } catch (e) {
          toast.error(e?.response?.data?.error || 'Erro ao iniciar o pagamento.');
          navigate(`/events/${data.event.id}`);
          return;
        }
      }
      toast.success('Evento criado e ativado!');
      navigate(`/events/${data.event.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao criar evento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-cream">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream"
          >
            <ChevronLeft size={16} />
            Voltar
          </button>
          <span className="flex items-center gap-2 font-serif text-base font-semibold tracking-tight">
            <Aperture size={15} className="text-gold" />
            Era Uma Vez
          </span>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Progresso — steps segmentados */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-2">
                <div className={`h-1 rounded-full transition-all duration-300 ${
                  i < step ? 'bg-gold/60' : i === step ? 'bg-gold' : 'bg-white/10'}`} />
                <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  i <= step ? 'text-cream/85' : 'text-cream-dim/50'}`}>
                  {i < step && <Check size={10} strokeWidth={3} className="text-emerald-400" />}
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Passo 1 */}
          {step === 0 && (
            <motion.div key="s0" {...stepAnim} className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Qual é o nome do evento?</h1>
                <p className="mt-2 text-sm text-cream-dim">Esse nome aparecerá para os seus convidados.</p>
              </div>
              <Input placeholder="Ex: Casamento da Ana & Pedro" value={form.name}
                onChange={(e) => set('name', e.target.value)} autoFocus />
              <div>
                <p className="mb-3 text-sm font-medium text-cream-dim">Tipo do evento</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {EVENT_TYPES.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => set('type', id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-1 py-4 text-xs font-medium transition-all duration-200 sm:gap-2.5 sm:py-5 sm:text-sm ${
                        form.type === id
                          ? 'border-gold/60 bg-gold/10 text-gold'
                          : 'border-line text-cream-dim hover:border-gold/40 hover:bg-gold/[0.04] hover:text-cream'}`}>
                      <Icon size={20} strokeWidth={1.6} className={form.type === id ? 'text-gold' : 'text-cream-dim'} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Passo 2 */}
          {step === 1 && (
            <motion.div key="s1" {...stepAnim} className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Configurações do evento</h1>
                <p className="mt-2 text-sm text-cream-dim">Defina as datas e limites do álbum.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-cream-dim">Início do evento</label>
                  <input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-cream-dim">Encerramento (para de aceitar fotos)</label>
                  <input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="input-field" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-cream-dim">Revelação (quando as fotos aparecem)</label>
                  <input type="datetime-local" value={form.revealAt} onChange={(e) => set('revealAt', e.target.value)} className="input-field" />
                  <p className="mt-1.5 text-xs text-cream-dim/70">Deixe vazio para revelar automaticamente no encerramento.</p>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-cream-dim">Fotos por convidado</label>
                <div className="flex flex-wrap gap-2">
                  {PHOTO_LIMITS.map((l) => (
                    <button key={l.value} onClick={() => set('photoLimitPerGuest', l.value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        form.photoLimitPerGuest === l.value
                          ? 'border-gold/70 bg-gold text-[#1c160c]'
                          : 'border-line text-cream-dim hover:border-gold/40 hover:text-cream'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-cream-dim">Filtro fotográfico padrão</label>
                <FilterSelector value={form.defaultFilter} onChange={(v) => set('defaultFilter', v)} />
              </div>
            </motion.div>
          )}

          {/* Passo 3 */}
          {step === 2 && (
            <motion.div key="s2" {...stepAnim} className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Escolha o plano</h1>
                <p className="mt-2 text-sm text-cream-dim">Quantos convidados você espera?</p>
              </div>
              <PlanSelector value={form.planId} onChange={(v) => set('planId', v)} />
            </motion.div>
          )}

          {/* Passo 4 */}
          {step === 3 && (
            <motion.div key="s3" {...stepAnim} className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Confirmar e criar</h1>
                <p className="mt-2 text-sm text-cream-dim">Revise as informações antes de continuar.</p>
              </div>
              <div className="card divide-y divide-line/60 p-6 text-sm [&>div]:py-3 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
                <Row label="Nome" value={form.name} />
                <Row label="Tipo" value={EVENT_TYPES.find((t) => t.id === form.type)?.label} />
                <Row label="Início" value={form.startsAt ? new Date(form.startsAt).toLocaleString('pt-BR') : '—'} />
                <Row label="Encerramento" value={form.endsAt ? new Date(form.endsAt).toLocaleString('pt-BR') : '—'} />
                <Row label="Revelação" value={form.revealAt ? new Date(form.revealAt).toLocaleString('pt-BR') : 'No encerramento'} />
                <Row label="Fotos/convidado" value={form.photoLimitPerGuest === 0 ? 'Ilimitado' : form.photoLimitPerGuest} />
                <Row label="Filtro" value={form.defaultFilter} />
                <Row label="Plano" value={(() => {
                  const plan = PLANS.find((p) => p.id === form.planId);
                  return plan ? `${plan.label} — ${formatBRL(plan.priceCents)}` : form.planId;
                })()} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navegação */}
        <div className="mt-10 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ChevronLeft size={16} />
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !form.name.trim()}>
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
      <span className="text-cream-dim">{label}</span>
      <span className="text-right font-medium text-cream">{value}</span>
    </div>
  );
}
