import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { formatBRL } from '../../utils/plans';

/**
 * Página de checkout / retorno de pagamento.
 * - Asaas (produção): o usuário paga na página do Asaas (invoiceUrl). Ao voltar,
 *   esta página faz polling do status até confirmar.
 * - Mock (dev): mostra um botão para simular a aprovação do pagamento.
 */
export default function Checkout() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const paymentId = params.get('payment');
  const navigate = useNavigate();

  const [state, setState] = useState(null); // { status, provider, isPaid, invoiceUrl, amountCents }
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!paymentId) return null;
    const data = await paymentApi.status(paymentId).catch(() => null);
    if (data) setState(data);
    return data;
  }, [paymentId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await refresh();
      if (active) setLoading(false);
      if (data && (data.isPaid || data.status === 'paid')) return;
      // Polling a cada 4s enquanto pendente (para captar o webhook do Asaas)
      pollRef.current = setInterval(async () => {
        const d = await refresh();
        if (d && (d.isPaid || d.status === 'paid')) {
          clearInterval(pollRef.current);
          toast.success('Pagamento confirmado! Evento ativado.');
          setTimeout(() => navigate(`/events/${id}`), 1200);
        }
      }, 4000);
    })();
    return () => { active = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh, id, navigate]);

  async function handleMockConfirm() {
    setConfirming(true);
    try {
      await paymentApi.confirmMock(paymentId);
      toast.success('Pagamento confirmado! Evento ativado.');
      setTimeout(() => navigate(`/events/${id}`), 900);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao confirmar.');
    } finally {
      setConfirming(false);
    }
  }

  const paid = state && (state.isPaid || state.status === 'paid');

  return (
    <div className="min-h-screen text-cream">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
          <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream">
            <ArrowLeft size={16} /> Voltar ao evento
          </Link>
          <span className="label-mono">Pagamento</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <div className="card p-8 text-center animate-scalein">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
              <p className="text-cream-dim">Carregando cobrança…</p>
            </div>
          ) : !paymentId || !state ? (
            <div className="py-6">
              <p className="text-cream-dim">Cobrança não encontrada.</p>
              <Link to={`/events/${id}`} className="btn-ghost mt-6 inline-flex">Voltar ao evento</Link>
            </div>
          ) : paid ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="h-14 w-14 text-success" />
              <h2 className="text-2xl">Pagamento confirmado</h2>
              <p className="text-cream-dim">Seu evento está ativo. Redirecionando…</p>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                <CreditCard className="h-6 w-6 text-gold" />
              </div>
              <h2 className="text-2xl">Concluir pagamento</h2>
              <p className="mt-2 text-cream-dim">
                Valor: <span className="text-cream">{formatBRL(state.amountCents || 0)}</span>
              </p>

              {state.provider === 'asaas' && state.invoiceUrl ? (
                <>
                  <a href={state.invoiceUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
                    <ExternalLink size={16} /> Pagar com Pix, boleto ou cartão
                  </a>
                  <p className="mt-4 flex items-center justify-center gap-2 text-xs text-cream-dim">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando confirmação do pagamento…
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-6 rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-xs text-cream-dim">
                    Ambiente de teste (sem gateway configurado). Simule a aprovação abaixo.
                  </p>
                  <button onClick={handleMockConfirm} disabled={confirming} className="btn-primary mt-4 w-full">
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simular pagamento aprovado'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
