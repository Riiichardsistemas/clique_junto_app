import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, User, Lock, CreditCard, Info, Mail, Calendar, Hash, ShieldCheck,
  Eye, EyeOff, ExternalLink, ReceiptText, CheckCircle2, XCircle, Clock, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext.jsx';
import { authApi } from '../api/authApi';
import { paymentApi } from '../api/paymentApi';
import { setToken } from '../api/axios';
import AppHeader from '../components/layout/AppHeader';

const TABS = [
  { id: 'perfil', label: 'Perfil', Icon: User },
  { id: 'pagamentos', label: 'Pagamentos', Icon: CreditCard },
  { id: 'seguranca', label: 'Segurança', Icon: Lock },
  { id: 'conta', label: 'Conta', Icon: Info },
];

/* Status de pagamento → rótulo, cor e ícone */
const PAY_STATUS = {
  paid:     { label: 'Aprovado',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', Icon: CheckCircle2 },
  pending:  { label: 'Pendente',    cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       Icon: Clock },
  failed:   { label: 'Recusado',    cls: 'text-red-400 bg-red-500/10 border-red-500/20',             Icon: XCircle },
  refunded: { label: 'Reembolsado', cls: 'text-sky-300 bg-sky-500/10 border-sky-500/20',             Icon: RotateCcw },
};

const METHOD_LABEL = {
  PIX: 'Pix', CREDIT_CARD: 'Cartão', BOLETO: 'Boleto', CREDITO: 'Crédito', UNDEFINED: '—',
};

function PasswordField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-[13px] text-cream-dim">{label}</label>
      <div className="relative">
        <input
          aria-label={label}
          type={show ? 'text' : 'password'}
          className="input-field pr-11"
          value={value}
          onChange={onChange}
          autoComplete={label === 'Senha atual' ? 'current-password' : 'new-password'}
        />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-cream-dim/70 transition hover:text-cream"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

/* Cartão de seção compacto */
function Card({ title, children, className = '' }) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      {title && <p className="label-mono mb-3 !text-[10px] text-cream/35">{title}</p>}
      {children}
    </div>
  );
}

export default function AccountSettings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('perfil');

  // Perfil
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Pagamentos
  const [payments, setPayments] = useState(null);
  const [payError, setPayError] = useState(false);

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (tab !== 'pagamentos' || payments !== null) return;
    paymentApi.mine()
      .then((d) => setPayments(d.payments || []))
      .catch(() => { setPayError(true); setPayments([]); });
  }, [tab, payments]);

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error('O nome não pode ser vazio.'); return; }
    setProfileSaving(true);
    try {
      const data = await authApi.updateMe({ name: name.trim(), email: email.trim() });
      setUser(data.user);
      toast.success('Perfil atualizado!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem.'); return; }
    setPasswordSaving(true);
    try {
      const data = await authApi.updateMe({ currentPassword, password: newPassword });
      if (data?.token) setToken(data.token);
      if (data?.user) setUser(data.user);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Senha atualizada!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const paidTotal = (payments || [])
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + (p.amountCents || 0), 0);

  return (
    <div className="app-shell text-cream">
      <AppHeader />

      <main className="mx-auto max-w-3xl animate-fadein px-4 py-6 sm:px-6 sm:py-8">
        {/* Cabeçalho compacto — avatar + nome ao lado (mobile-first) */}
        <div className="mb-5 flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border font-serif text-xl text-gold"
            style={{
              borderColor: 'rgba(210,173,120,0.35)',
              background: 'radial-gradient(circle at 35% 30%, rgba(210,173,120,0.22), rgba(210,173,120,0.06))',
            }}>
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-2xl font-semibold tracking-tight sm:text-[28px]">{user?.name || 'Sua conta'}</h1>
            <p className="truncate text-[13px] text-cream-dim">{user?.email}</p>
          </div>
        </div>

        {/* Abas — pills roláveis */}
        <div className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seções da conta">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition ${
                tab === id
                  ? 'border-gold bg-gold text-[#1c160c]'
                  : 'border-line bg-surface text-cream-dim hover:text-cream'}`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ===== Perfil ===== */}
        {tab === 'perfil' && (
          <Card title="Dados do perfil" className="animate-fadein">
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] text-cream-dim">Nome</label>
                <input aria-label="Nome" className="input-field" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nome" maxLength={80} required />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-cream-dim">Email</label>
                <input aria-label="Email" type="email" className="input-field" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
              </div>
              <button type="submit" disabled={profileSaving} className="btn-primary w-full">
                {profileSaving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </form>
          </Card>
        )}

        {/* ===== Pagamentos ===== */}
        {tab === 'pagamentos' && (
          <div className="animate-fadein space-y-3">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-2">
              <Card>
                <p className="label-mono !text-[9.5px] text-cream/35">Total pago</p>
                <p className="mt-1 font-serif text-xl font-semibold text-cream">
                  {(paidTotal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </Card>
              <Card>
                <p className="label-mono !text-[9.5px] text-cream/35">Cobranças</p>
                <p className="mt-1 font-serif text-xl font-semibold text-cream">{payments?.length ?? '—'}</p>
              </Card>
            </div>

            <Card title="Histórico de pagamentos">
              {payments === null ? (
                <div className="flex justify-center py-8">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
                </div>
              ) : payError ? (
                <p className="py-6 text-center text-[13px] text-cream/40">Não foi possível carregar seus pagamentos.</p>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <ReceiptText size={26} className="text-cream/25" />
                  <p className="mt-3 text-sm font-medium text-cream/60">Nenhum pagamento ainda</p>
                  <p className="mt-1 text-[13px] text-cream/35">Suas cobranças de eventos aparecem aqui.</p>
                </div>
              ) : (
                <ul className="-my-1 divide-y divide-line/40">
                  {payments.map((p) => {
                    const st = PAY_STATUS[p.status] || PAY_STATUS.pending;
                    const method = METHOD_LABEL[p.billingType] || (p.provider === 'credit' ? 'Crédito' : '—');
                    return (
                      <li key={p.id} className="flex items-center gap-3 py-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${st.cls}`}>
                          <st.Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-cream">{p.eventName}</p>
                          <p className="mt-0.5 truncate text-[11.5px] text-cream/40">
                            {p.planLabel} · {method} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[14px] font-semibold text-cream">{p.amount}</p>
                          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-semibold ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>
                        {p.invoiceUrl && (
                          <a href={p.invoiceUrl} target="_blank" rel="noreferrer" aria-label="Ver recibo"
                            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cream/40 transition hover:text-cream">
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        )}

        {/* ===== Segurança ===== */}
        {tab === 'seguranca' && (
          <Card title="Alterar senha" className="animate-fadein">
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <PasswordField label="Senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <PasswordField label="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <button type="submit" disabled={passwordSaving} className="btn-primary w-full">
                {passwordSaving ? 'Atualizando…' : 'Atualizar senha'}
              </button>
            </form>
          </Card>
        )}

        {/* ===== Conta ===== */}
        {tab === 'conta' && (
          <div className="animate-fadein space-y-3">
            <Card title="Informações da conta">
              <div className="divide-y divide-line/40">
                {[
                  [<Mail size={15} />, 'Email', user?.email || '—'],
                  [<Calendar size={15} />, 'Conta criada', user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'],
                  [<Hash size={15} />, 'ID da conta', user?.id ? String(user.id).slice(0, 8) : '—'],
                ].map(([icon, k, v], i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <span className="flex items-center gap-2 text-cream/45">{icon} {k}</span>
                    <span className="truncate text-right font-medium text-cream">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <span className="flex items-center gap-2 text-cream/45"><ShieldCheck size={15} /> Status</span>
                  <span className="badge-active">Verificada</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-cream">Sessão</p>
                  <p className="mt-0.5 text-[13px] text-cream-dim">Saia com segurança deste dispositivo.</p>
                </div>
                <button type="button" className="btn-danger-ghost shrink-0" onClick={handleLogout}>
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
