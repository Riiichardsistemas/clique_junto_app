import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2, QrCode, CreditCard, Loader2, ArrowLeft, Copy, ShieldCheck, ChevronLeft,
} from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { eventApi } from '../../api/eventApi';
import { getPlan, formatBRL } from '../../utils/plans';

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
    </div>
  );
}

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState(null); // null | 'pix' | 'card'
  const [paid, setPaid] = useState(false);

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

  function onPaid() {
    setPaid(true);
    toast.success('Pagamento confirmado! Evento ativado.');
    setTimeout(() => navigate(`/events/${id}`), 1400);
  }

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen text-cream">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-3.5">
          <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream">
            <ArrowLeft size={16} /> Voltar ao evento
          </Link>
          <span className="label-mono">Pagamento</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        {paid ? (
          <div className="card p-8 text-center animate-scalein">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <h2 className="mt-3 text-2xl">Pagamento confirmado</h2>
            <p className="mt-1 text-cream-dim">Seu evento está ativo. Redirecionando…</p>
          </div>
        ) : (
          <>
            {/* Resumo do plano */}
            <div className="card mb-5 flex items-center justify-between p-5">
              <div>
                <p className="label-mono">{event?.name}</p>
                <p className="mt-1 text-lg text-cream">{plan?.label || event?.planId}</p>
              </div>
              <p className="text-2xl font-semibold text-cream">{formatBRL(plan?.priceCents || 0)}</p>
            </div>

            {!method && (
              <div className="animate-fadein space-y-3">
                <p className="mb-1 text-sm text-cream-dim">Escolha como pagar:</p>
                <button onClick={() => setMethod('pix')}
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
                <button onClick={() => setMethod('card')}
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
                onBack={() => setMethod(null)} onPaid={onPaid} />
            )}
            {method === 'card' && (
              <CardPanel eventId={id} planId={event.planId}
                onBack={() => setMethod(null)} onPaid={onPaid} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------------- Pix ---------------- */
function PixPanel({ eventId, planId, onBack, onPaid }) {
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
      .catch((e) => active && setError(e?.response?.data?.error || 'Erro ao gerar o Pix.'))
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
    <div className="card animate-fadein p-6">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-cream-dim hover:text-cream">
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
              <input readOnly value={pix.payload} className="input-field flex-1 text-xs" onFocus={(e) => e.target.select()} />
              <button onClick={copyCode} className="btn-ghost btn-sm shrink-0"><Copy size={14} /></button>
            </div>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-cream-dim">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando confirmação do pagamento…
          </p>
          {isMock && (
            <button onClick={simulate} disabled={confirming} className="btn-primary mt-4 w-full">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simular pagamento aprovado (teste)'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Cartão ---------------- */
function CardPanel({ eventId, planId, onBack, onPaid }) {
  const [f, setF] = useState({
    holderName: '', number: '', expiry: '', ccv: '',
    cpfCnpj: '', postalCode: '', addressNumber: '', phone: '',
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
    <form onSubmit={submit} className="card animate-fadein space-y-3 p-6">
      <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-sm text-cream-dim hover:text-cream">
        <ChevronLeft size={15} /> Outros métodos
      </button>
      <h3 className="text-lg font-semibold">Pague com cartão</h3>

      <div>
        <label className="mb-1 block text-xs text-cream-dim">Nome impresso no cartão</label>
        <input className={inp} value={f.holderName} onChange={(e) => set('holderName', e.target.value)} placeholder="NOME COMPLETO" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-cream-dim">Número do cartão</label>
        <input className={inp} value={f.number} inputMode="numeric" maxLength={19}
          onChange={(e) => set('number', onlyDigits(e.target.value).replace(/(.{4})/g, '$1 ').trim())}
          placeholder="0000 0000 0000 0000" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-cream-dim">Validade (MM/AA)</label>
          <input className={inp} value={f.expiry} inputMode="numeric" maxLength={5}
            onChange={(e) => { let v = onlyDigits(e.target.value).slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2); set('expiry', v); }}
            placeholder="MM/AA" required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cream-dim">CVV</label>
          <input className={inp} value={f.ccv} inputMode="numeric" maxLength={4}
            onChange={(e) => set('ccv', onlyDigits(e.target.value))} placeholder="123" required />
        </div>
      </div>

      <div className="border-t border-line/60 pt-3">
        <p className="mb-2 text-xs text-cream-dim">Dados do titular (exigidos pela operadora)</p>
        <div className="grid grid-cols-2 gap-3">
          <input className={inp} value={f.cpfCnpj} inputMode="numeric" placeholder="CPF"
            onChange={(e) => set('cpfCnpj', onlyDigits(e.target.value))} required />
          <input className={inp} value={f.phone} inputMode="numeric" placeholder="Celular (DDD+número)"
            onChange={(e) => set('phone', onlyDigits(e.target.value))} required />
          <input className={inp} value={f.postalCode} inputMode="numeric" placeholder="CEP"
            onChange={(e) => set('postalCode', onlyDigits(e.target.value))} required />
          <input className={inp} value={f.addressNumber} placeholder="Nº do endereço"
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
