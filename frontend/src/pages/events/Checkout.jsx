import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2, QrCode, CreditCard, Loader2, ArrowLeft, Copy, ShieldCheck, ChevronLeft,
  Coins, MessageCircle,
} from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { eventApi } from '../../api/eventApi';
import { authApi } from '../../api/authApi';
import { getPlan, formatBRL, isCustomPlan } from '../../utils/plans';
import { useAuth } from '../../contexts/AuthContext';
import PageLoader from '../../components/ui/PageLoader';

const CONTACT_EMAIL = 'contato@papelariabaldasso.com.br';

// Mascara CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) conforme o tamanho.
function maskCpfCnpj(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState(null); // null | 'pix' | 'card'
  const [paid, setPaid] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [cpfModalOpen, setCpfModalOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState(null);

  useEffect(() => {
    eventApi.getOne(id)
      .then((d) => {
        setEvent(d.event);
        if (d.event.isPaid && d.event.status !== 'draft') { setPaid(true); }
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const plan = event ? getPlan(event.planId) : null;
  const custom = isCustomPlan(plan);
  const price = plan?.priceCents || 0;
  const creditCents = user?.creditCents || 0;
  const canUseCredit = !custom && price > 0 && creditCents >= price;

  function onPaid() {
    setPaid(true);
    toast.success('Pagamento confirmado! Evento ativado.');
    setTimeout(() => navigate(`/events/${id}`), 1400);
  }

  // Escolhe o meio de pagamento; se faltar CPF/CNPJ no perfil, abre o modal antes.
  function choose(m) {
    if (!user?.cpfCnpj) {
      setPendingMethod(m);
      setCpfModalOpen(true);
      return;
    }
    setMethod(m);
  }

  // Chamado pelo modal após salvar o CPF/CNPJ: segue para o método pendente.
  function onCpfSaved(updatedUser) {
    if (updatedUser) setUser(updatedUser);
    setCpfModalOpen(false);
    if (pendingMethod) { setMethod(pendingMethod); setPendingMethod(null); }
  }

  async function redeemCredit() {
    setRedeeming(true);
    try {
      const d = await paymentApi.credit(id, event.planId);
      if (d.user) setUser(d.user);
      setPaid(true);
      toast.success('Evento ativado com seus créditos!');
      setTimeout(() => navigate(`/events/${id}`), 1400);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível usar os créditos.');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) return <PageLoader label="Carregando pagamento" />;

  return (
    <div className="app-screen text-cream">
      <header className="app-topbar glass sticky top-0 z-20">
        <div className="mx-auto flex min-h-[56px] max-w-lg items-center justify-between px-4 sm:px-6">
          <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream">
            <ArrowLeft size={16} /> Voltar ao evento
          </Link>
          <span className="label-mono">Pagamento</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-10">
        {paid ? (
          <div className="card p-8 text-center animate-scalein">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <h2 className="mt-3 text-2xl">Pagamento confirmado</h2>
            <p className="mt-1 text-cream-dim">Seu evento está ativo. Redirecionando…</p>
          </div>
        ) : (
          <>
            {/* Resumo do plano */}
            <div className="card mb-5 flex items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="label-mono truncate">{event?.name}</p>
                <p className="mt-1 text-lg text-cream">{plan?.label || event?.planId}</p>
              </div>
              <p className="shrink-0 text-2xl font-semibold text-cream">{formatBRL(plan ? plan.priceCents : 0)}</p>
            </div>

            {custom ? (
              <div className="card animate-fadein p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10">
                  <MessageCircle className="h-6 w-6 text-gold" />
                </span>
                <h3 className="mt-3 text-lg font-semibold text-cream">Plano sob consulta</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-cream-dim">
                  Para eventos com mais de 200 participantes, montamos um plano com limites sob medida. Fale com a gente para liberar o seu.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Plano personalizado — ' + (event?.name || ''))}`}
                  className="btn-primary mt-4 inline-flex w-full items-center justify-center"
                >
                  Falar com a equipe
                </a>
                <p className="mt-3 text-xs text-cream-dim/70">{CONTACT_EMAIL}</p>
              </div>
            ) : (
            <>
            {/* Pagar com créditos (quando o saldo cobre o plano) */}
            {canUseCredit && !method && (
              <div className="card mb-3 animate-fadein p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                    <Coins className="h-5 w-5 text-gold" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-cream">Usar meus créditos</p>
                    <p className="text-xs text-cream-dim">Saldo disponível: {formatBRL(creditCents)}</p>
                  </div>
                </div>
                <button type="button" onClick={redeemCredit} disabled={redeeming} className="btn-primary mt-4 w-full">
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : `Ativar com créditos (${formatBRL(price)})`}
                </button>
                <p className="mt-2 text-center text-[11px] text-cream-dim/70">O valor é descontado do seu saldo e o evento é ativado na hora.</p>
              </div>
            )}

            {!method && (
              <div className="animate-fadein space-y-3">
                <p className="mb-1 text-sm text-cream-dim">Escolha como pagar:</p>
                <button type="button" onClick={() => choose('pix')}
                  className="card card-hover flex w-full items-center gap-4 p-5 text-left">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                    <QrCode className="h-5 w-5 text-gold" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-cream">Pix</span>
                    <span className="block text-xs text-cream-dim">Aprovação na hora, sem taxa de cartão</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 rotate-180 text-cream-dim" />
                </button>
                <button type="button" onClick={() => choose('card')}
                  className="card card-hover flex w-full items-center gap-4 p-5 text-left">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                    <CreditCard className="h-5 w-5 text-gold" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-cream">Cartão de crédito</span>
                    <span className="block text-xs text-cream-dim">Ativa o evento imediatamente</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 rotate-180 text-cream-dim" />
                </button>
              </div>
            )}

            {method === 'pix' && (
              <PixPanel eventId={id} planId={event.planId} amountCents={plan?.priceCents}
                onBack={() => setMethod(null)} onPaid={onPaid}
                onNeedCpf={() => { setMethod(null); setPendingMethod('pix'); setCpfModalOpen(true); }} />
            )}
            {method === 'card' && (
              <CardPanel eventId={id} planId={event.planId} defaultCpf={user?.cpfCnpj || ''}
                onBack={() => setMethod(null)} onPaid={onPaid} />
            )}
            </>
            )}
          </>
        )}
      </main>

      <CpfModal
        open={cpfModalOpen}
        defaultValue={user?.cpfCnpj || ''}
        onClose={() => { setCpfModalOpen(false); setPendingMethod(null); }}
        onSaved={onCpfSaved}
      />
    </div>
  );
}

/* ---------------- Modal de CPF/CNPJ ---------------- */
function CpfModal({ open, defaultValue, onClose, onSaved }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setValue(maskCpfCnpj(defaultValue)); }, [open, defaultValue]);

  if (!open) return null;

  async function save(e) {
    e.preventDefault();
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      toast.error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }
    setSaving(true);
    try {
      const d = await authApi.updateMe({ cpfCnpj: digits });
      toast.success('Dados salvos.');
      onSaved(d.user);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível salvar seus dados.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={save} className="card w-full max-w-md animate-scalein p-6">
        <h3 className="text-lg font-semibold text-cream">Dados para pagamento</h3>
        <p className="mt-1 text-sm text-cream-dim">
          O Asaas exige seu CPF ou CNPJ para gerar a cobrança. Ele fica salvo no seu perfil para as próximas vezes.
        </p>
        <label className="mt-4 mb-1 block text-xs text-cream-dim">CPF ou CNPJ</label>
        <input
          className="input-field"
          inputMode="numeric"
          autoFocus
          placeholder="000.000.000-00"
          aria-label="CPF ou CNPJ"
          value={value}
          onChange={(e) => setValue(maskCpfCnpj(e.target.value))}
        />
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost btn-sm flex-1" disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary btn-sm flex-1" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar e continuar'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Pix ---------------- */
function PixPanel({ eventId, planId, onBack, onPaid, onNeedCpf }) {
  const [pix, setPix] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    let active = true;
    paymentApi.pix(eventId, planId)
      .then((d) => {
        if (!active) return;
        setPix(d.pix); setPaymentId(d.paymentId); setIsMock(!!d.mock);
      })
      .catch((e) => {
        if (!active) return;
        // Falta CPF/CNPJ no perfil: pede pelo modal em vez de mostrar erro.
        if (e?.response?.data?.needCpf && onNeedCpf) { onNeedCpf(); return; }
        setError(e?.response?.data?.error || 'Erro ao gerar o Pix.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [eventId, planId]);

  const poll = useCallback(async () => {
    if (!paymentId) return;
    const d = await paymentApi.status(paymentId).catch(() => null);
    if (d && (d.isPaid || d.status === 'paid')) { clearInterval(pollRef.current); onPaid(); }
  }, [paymentId, onPaid]);

  useEffect(() => {
    if (!paymentId) return undefined;
    pollRef.current = setInterval(poll, 4000);
    return () => clearInterval(pollRef.current);
  }, [paymentId, poll]);

  async function copyCode() {
    if (pix?.payload) { await navigator.clipboard.writeText(pix.payload); toast.success('Código Pix copiado!'); }
  }

  async function simulate() {
    setConfirming(true);
    try { await paymentApi.confirmMock(paymentId); onPaid(); }
    catch (e) { toast.error(e?.response?.data?.error || 'Erro.'); }
    finally { setConfirming(false); }
  }

  return (
    <div className="card animate-fadein p-5 sm:p-6">
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-cream-dim hover:text-cream">
        <ChevronLeft size={15} /> Outros métodos
      </button>
      <h3 className="text-lg font-semibold">Pague com Pix</h3>

      {loading ? (
        <div className="flex items-center gap-3 py-10 text-cream-dim"><Loader2 className="h-5 w-5 animate-spin text-gold" /> Gerando QR Code…</div>
      ) : error ? (
        <p className="py-6 text-danger">{error}</p>
      ) : (
        <>
          {pix?.encodedImage && (
            <div className="mt-4 flex justify-center">
              <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code Pix"
                className="h-56 w-56 rounded-xl bg-white p-2" />
            </div>
          )}
          <p className="mt-4 text-center text-sm text-cream-dim">Escaneie o QR no app do seu banco ou copie o código:</p>
          {pix?.payload && (
            <div className="mt-2 flex gap-2">
              <input readOnly value={pix.payload} aria-label="Código Pix copia e cola" className="input-field flex-1 text-xs" onFocus={(e) => e.target.select()} />
              <button type="button" onClick={copyCode} aria-label="Copiar código Pix" className="btn-ghost btn-sm shrink-0"><Copy size={14} /></button>
            </div>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-cream-dim">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando confirmação do pagamento…
          </p>
          {isMock && (
            <button type="button" onClick={simulate} disabled={confirming} className="btn-primary mt-4 w-full">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simular pagamento aprovado (teste)'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Cartão ---------------- */
function CardPanel({ eventId, planId, onBack, onPaid, defaultCpf = '' }) {
  const [f, setF] = useState({
    holderName: '', number: '', expiry: '', ccv: '',
    cpfCnpj: maskCpfCnpj(defaultCpf), postalCode: '', addressNumber: '', phone: '',
  });
  const [sending, setSending] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const [mm, yy] = f.expiry.split('/').map((x) => x && x.trim());
    if (!mm || !yy) { toast.error('Validade inválida (use MM/AA).'); return; }
    const expiryYear = yy.length === 2 ? `20${yy}` : yy;

    setSending(true);
    try {
      const d = await paymentApi.card(eventId, planId, {
        card: { holderName: f.holderName, number: onlyDigits(f.number), expiryMonth: mm, expiryYear, ccv: onlyDigits(f.ccv) },
        holderInfo: { cpfCnpj: onlyDigits(f.cpfCnpj), postalCode: onlyDigits(f.postalCode), addressNumber: f.addressNumber, phone: onlyDigits(f.phone) },
      });
      if (d.status === 'paid') onPaid();
      else toast('Pagamento em processamento. Avisaremos ao confirmar.', { icon: '⏳' });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível processar o cartão.');
    } finally {
      setSending(false);
    }
  }

  const inp = 'input-field';
  return (
    <form onSubmit={submit} className="card animate-fadein space-y-3 p-5 sm:p-6">
      <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-sm text-cream-dim hover:text-cream">
        <ChevronLeft size={15} /> Outros métodos
      </button>
      <h3 className="text-lg font-semibold">Pague com cartão</h3>

      <div>
        <label className="mb-1 block text-xs text-cream-dim">Nome impresso no cartão</label>
        <input aria-label="Nome impresso no cartão" className={inp} value={f.holderName} onChange={(e) => set('holderName', e.target.value)} placeholder="NOME COMPLETO" autoComplete="cc-name" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-cream-dim">Número do cartão</label>
        <input aria-label="Número do cartão" className={inp} value={f.number} inputMode="numeric" maxLength={19} autoComplete="cc-number"
          onChange={(e) => set('number', onlyDigits(e.target.value).replace(/(.{4})/g, '$1 ').trim())}
          placeholder="0000 0000 0000 0000" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-cream-dim">Validade (MM/AA)</label>
          <input aria-label="Validade do cartão" className={inp} value={f.expiry} inputMode="numeric" maxLength={5} autoComplete="cc-exp"
            onChange={(e) => { let v = onlyDigits(e.target.value).slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2); set('expiry', v); }}
            placeholder="MM/AA" required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cream-dim">CVV</label>
          <input aria-label="Código de segurança do cartão" className={inp} value={f.ccv} inputMode="numeric" maxLength={4} autoComplete="cc-csc"
            onChange={(e) => set('ccv', onlyDigits(e.target.value))} placeholder="123" required />
        </div>
      </div>

      <div className="border-t border-line/60 pt-3">
        <p className="mb-2 text-xs text-cream-dim">Dados do titular (exigidos pela operadora)</p>
        <div className="grid grid-cols-2 gap-3">
          <input className={inp} value={f.cpfCnpj} inputMode="numeric" placeholder="CPF" aria-label="CPF do titular" autoComplete="off"
            onChange={(e) => set('cpfCnpj', onlyDigits(e.target.value))} required />
          <input className={inp} value={f.phone} inputMode="numeric" placeholder="Celular (DDD+número)" aria-label="Celular do titular" autoComplete="tel"
            onChange={(e) => set('phone', onlyDigits(e.target.value))} required />
          <input className={inp} value={f.postalCode} inputMode="numeric" placeholder="CEP" aria-label="CEP do titular" autoComplete="postal-code"
            onChange={(e) => set('postalCode', onlyDigits(e.target.value))} required />
          <input className={inp} value={f.addressNumber} placeholder="Nº do endereço" aria-label="Número do endereço" autoComplete="address-line2"
            onChange={(e) => set('addressNumber', e.target.value)} required />
        </div>
      </div>

      <button type="submit" disabled={sending} className="btn-primary w-full">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pagar'}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-cream-dim/70">
        <ShieldCheck size={12} /> Dados enviados de forma segura ao processador de pagamento.
      </p>
    </form>
  );
}
