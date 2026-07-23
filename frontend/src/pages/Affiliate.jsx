import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, Check, Copy, Gift, Loader2, Megaphone, PartyPopper, Percent,
  Rocket, Share2, Sparkles, TrendingUp, Users, Wallet, X, Coins,
} from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import { affiliateApi } from '../api/affiliateApi';
import { formatDateTime } from '../utils/admin';

// Exemplos de ganho por plano (valores reais dos planos pagos).
const EARN_EXAMPLES = [
  { plan: 'Essencial', price: 'R$ 49,90', earn: 'R$ 9,98' },
  { plan: 'Celebração', price: 'R$ 89,90', earn: 'R$ 17,98' },
  { plan: 'Especial', price: 'R$ 159,00', earn: 'R$ 31,80' },
  { plan: 'Grande Evento', price: 'R$ 299,00', earn: 'R$ 59,80' },
];

const STATUS_LABEL = { pending: 'A receber', paid: 'Pago', canceled: 'Cancelado' };
const STATUS_CLASS = {
  pending: 'badge-closed',
  paid: 'badge-active',
  canceled: 'border-danger/25 bg-danger/10 text-danger badge',
};

export default function Affiliate() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    affiliateApi.me()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function copyLink() {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.');
    }
  }

  async function shareLink() {
    if (!data?.referralLink) return;
    const shareData = {
      title: 'Era uma vez — crie o álbum do seu evento',
      text: `Crie o álbum colaborativo do seu evento. Use meu link:`,
      url: data.referralLink,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelado */ }
    } else {
      copyLink();
    }
  }

  const stats = data?.stats;

  return (
    <div className="app-shell text-cream">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-9 sm:flex-row sm:items-end">
          <div>
            <p className="label-mono mb-2 text-gold">Indique e ganhe</p>
            <h1 className="text-gradient font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-[42px]">
              Programa de afiliados
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cream-dim">
              Compartilhe seu link. Quando alguém se cadastrar por ele e contratar um evento pago,
              você ganha {data?.rateLabel || '20%'} do valor — em toda compra que essa pessoa fizer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHowTo(true)}
            className="group flex shrink-0 items-center justify-center gap-2 rounded-full border border-gold/30 bg-gold/[0.10] px-5 py-3 text-sm font-bold text-gold-light shadow-[0_0_24px_-8px_rgba(212,175,120,0.5)] transition hover:border-gold/50 hover:bg-gold/[0.16]"
          >
            <Sparkles size={16} className="transition group-hover:rotate-12" />
            Como funciona? Ganhe dinheiro
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-cream-dim">
            <Loader2 className="animate-spin text-gold" /> Carregando seu painel…
          </div>
        ) : error ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center" role="alert">
            <p className="font-serif text-2xl text-cream">Não foi possível carregar</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-cream-dim">Verifique sua conexão e tente novamente.</p>
            <button type="button" className="btn-ghost mt-6" onClick={load}>Tentar novamente</button>
          </div>
        ) : (
          <div className="animate-fadein space-y-8">
            {/* Link de indicação */}
            <section className="card overflow-hidden p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
                  <Gift size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-cream">Seu link de indicação</p>
                  <p className="text-[11px] text-cream-dim">Código: <span className="font-mono text-gold">{data.referralCode}</span></p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-white/[0.02] px-4 py-3">
                  <span className="truncate font-mono text-sm text-cream">{data.referralLink}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={copyLink} className="btn-primary flex-1 sm:flex-none">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button type="button" onClick={shareLink} className="btn-ghost flex-1 sm:flex-none" aria-label="Compartilhar link">
                    <Share2 size={16} /> Compartilhar
                  </button>
                </div>
              </div>
            </section>

            {/* Ganhos */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Wallet} highlight label="A receber" value={stats.pending}
                hint="Comissões aprovadas aguardando repasse" />
              <StatCard icon={Sparkles} label="Já pago" value={stats.paid}
                hint="Repasses já concluídos" />
              <StatCard icon={TrendingUp} label="Total gerado" value={stats.total}
                hint="Soma de tudo que você já ganhou" />
              <StatCard icon={Users} label="Indicações" value={String(stats.referralCount)}
                hint={`${stats.convertedCount} já compraram`} />
            </section>

            {/* Comissões */}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-cream">Minhas comissões</h2>
              <div className="card overflow-hidden">
                <div className="hidden grid-cols-[1fr,120px,120px,140px] gap-4 border-b border-line bg-white/[0.018] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cream-dim/70 md:grid">
                  <span>Origem</span><span>Venda</span><span>Comissão</span><span>Status</span>
                </div>
                {data.commissions.length ? (
                  <div className="divide-y divide-line/60">
                    {data.commissions.map((c) => (
                      <div key={c.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-4 md:grid-cols-[1fr,120px,120px,140px]">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-cream">{c.eventName}</p>
                          <p className="mt-1 truncate text-[11px] text-cream-dim">{c.referredName} · {formatDateTime(c.createdAt)}</p>
                        </div>
                        <div className="hidden md:block"><p className="text-sm text-cream">{c.saleAmount}</p></div>
                        <div className="hidden md:block"><p className="text-sm font-semibold text-gold">{c.commission}</p></div>
                        <div className="flex items-center justify-end gap-2 md:justify-start">
                          <span className="text-sm font-semibold text-gold md:hidden">{c.commission}</span>
                          <span className={STATUS_CLASS[c.status] || 'badge-draft'}>{STATUS_LABEL[c.status] || c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Wallet} title="Nenhuma comissão ainda"
                    subtitle="Quando um indicado seu contratar um evento pago, a comissão aparece aqui." />
                )}
              </div>
            </section>

            {/* Indicados */}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-cream">Quem você indicou</h2>
              <div className="card overflow-hidden">
                {data.referrals.length ? (
                  <div className="divide-y divide-line/60">
                    {data.referrals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-cream">{r.name}</p>
                          <p className="truncate text-[11px] text-cream-dim">{r.email} · entrou em {formatDateTime(r.joinedAt)}</p>
                        </div>
                        <span className={r.hasPurchased ? 'badge-active' : 'badge-draft'}>
                          {r.hasPurchased ? 'Comprou' : 'Cadastrado'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Users} title="Você ainda não indicou ninguém"
                    subtitle="Compartilhe seu link acima para começar a ganhar comissões." />
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {showHowTo && (
        <HowItWorksModal
          rateLabel={data?.rateLabel || '20%'}
          referralLink={data?.referralLink}
          copied={copied}
          onCopy={copyLink}
          onShare={shareLink}
          onClose={() => setShowHowTo(false)}
        />
      )}
    </div>
  );
}

function HowItWorksModal({ rateLabel, referralLink, copied, onCopy, onShare, onClose }) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const steps = [
    { icon: Megaphone, title: 'Compartilhe seu link', text: 'Envie no WhatsApp, Instagram ou para amigos que vão fazer uma festa, casamento ou evento.' },
    { icon: Users, title: 'Seu amigo cria a conta', text: 'Ele se cadastra pelo seu link e monta o álbum do evento dele — simples assim.' },
    { icon: Coins, title: 'Você ganha comissão', text: `A cada evento pago que ele contratar, ${rateLabel} caem no seu saldo. Para sempre, em toda compra.` },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm animate-fadein sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Como funciona o programa de afiliados"
        className="safe-bottom relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-[#0d0d0f] shadow-2xl animate-slideup sm:rounded-3xl"
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-black/40 text-cream-dim transition hover:text-cream">
          <X size={17} />
        </button>

        <div className="overflow-y-auto">
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-gold/15 bg-gradient-to-b from-gold/[0.14] to-transparent px-6 pb-7 pt-9 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/[0.12] text-gold">
              <PartyPopper size={26} />
            </div>
            <h2 className="font-serif text-2xl text-cream sm:text-3xl">Ganhe dinheiro indicando</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-cream-dim">
              Transforme suas indicações em renda. Sem custo, sem limite de ganhos.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.10] px-5 py-2">
              <Percent size={18} className="text-gold" />
              <span className="text-lg font-bold text-gold-light">{rateLabel} de comissão</span>
              <span className="text-xs text-cream-dim">em cada venda</span>
            </div>
          </div>

          <div className="space-y-7 px-6 py-7">
            {/* Passos */}
            <div>
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-cream-dim/70">Como funciona</p>
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={s.title} className="flex items-start gap-4 rounded-2xl border border-line bg-white/[0.02] p-4">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
                      <s.icon size={19} />
                      <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-black">{i + 1}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cream">{s.title}</p>
                      <p className="mt-1 text-[13px] leading-5 text-cream-dim">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quanto você ganha */}
            <div>
              <p className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cream-dim/70">
                <TrendingUp size={14} className="text-gold" /> Quanto você ganha
              </p>
              <div className="overflow-hidden rounded-2xl border border-line">
                <div className="grid grid-cols-[1fr,auto,auto] gap-3 border-b border-line bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cream-dim/70">
                  <span>Plano do amigo</span><span className="text-right">Valor</span><span className="text-right">Você ganha</span>
                </div>
                {EARN_EXAMPLES.map((e) => (
                  <div key={e.plan} className="grid grid-cols-[1fr,auto,auto] items-center gap-3 border-b border-line/50 px-4 py-2.5 last:border-0">
                    <span className="text-sm text-cream">{e.plan}</span>
                    <span className="text-right text-sm text-cream-dim">{e.price}</span>
                    <span className="text-right text-sm font-bold text-gold">{e.earn}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] text-cream-dim">
                <Rocket size={14} className="text-gold" />
                Indicou 10 amigos no plano Celebração? <span className="font-semibold text-gold-light">R$ 179,80</span> pra você.
              </p>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-4">
              <p className="mb-3 text-center text-sm font-semibold text-cream">Pronto? É só compartilhar seu link 👇</p>
              {referralLink && (
                <div className="mb-3 flex items-center rounded-xl border border-line bg-black/30 px-3 py-2.5">
                  <span className="truncate font-mono text-xs text-cream-dim">{referralLink}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={onCopy} className="btn-primary flex-1">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <button type="button" onClick={onShare} className="btn-ghost flex-1">
                  <Share2 size={16} /> Compartilhar
                </button>
              </div>
            </div>

            <button type="button" onClick={onClose} className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-cream-dim transition hover:text-cream">
              Começar a indicar agora <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, highlight }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-gold/25 bg-gold/[0.05]' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${highlight ? 'border-gold/30 bg-gold/[0.10] text-gold' : 'border-line bg-white/[0.03] text-cream-dim'}`}>
          <Icon size={15} />
        </span>
        <p className="text-xs text-cream-dim">{label}</p>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${highlight ? 'text-gold' : 'text-cream'}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-cream-dim/70">{hint}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <Icon size={26} className="mb-3 text-cream-dim/40" />
      <p className="text-sm font-semibold text-cream">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-cream-dim">{subtitle}</p>
    </div>
  );
}
