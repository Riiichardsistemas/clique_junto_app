import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext.jsx';
import { authApi } from '../api/authApi';
import AppHeader from '../components/layout/AppHeader';

/* ---------- Ícones ---------- */
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconId = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="12" r="2.5" /><path d="M14 10h5M14 14h5" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);
const IconEye = ({ off }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    {off ? (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="m2 2 20 20" />
      </>
    ) : (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

/* ---------- Painel de seção (ícone + título + divisor, como no print) ---------- */
function Section({ icon, title, children, className = '' }) {
  return (
    <div className={`card p-5 sm:p-6 ${className}`}>
      <div className="card-section-header">
        {icon}
        <span className="card-section-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------- Input de senha com olhinho ---------- */
function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-[13px] text-cream-dim">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input-field pr-11"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cream-dim/70 transition-colors hover:text-cream"
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <IconEye off={show} />
        </button>
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const { user, setUser } = useAuth();

  // Perfil
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error('O nome não pode ser vazio.'); return; }
    setProfileSaving(true);
    try {
      const data = await authApi.updateMe({ name: name.trim(), email: email.trim() });
      setUser(data.user);
      toast.success('Perfil atualizado com sucesso!');
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
      await authApi.updateMe({ currentPassword, password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha atualizada com sucesso!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen text-cream">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-7 animate-fadein sm:px-6 sm:py-10">
        {/* Cabeçalho — título serifado grande como no print */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-[42px]">
            Configurações da Conta
          </h1>
          <p className="mt-2 text-sm text-cream-dim">Gerencie seu perfil e segurança.</p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Perfil */}
          <Section icon={<IconUser />} title="Perfil">
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="mb-6 flex flex-col items-center gap-3 py-2">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full border font-serif text-3xl text-gold"
                  style={{
                    borderColor: 'rgba(196,169,108,0.35)',
                    background: 'radial-gradient(circle at 35% 30%, rgba(196,169,108,0.22), rgba(196,169,108,0.06))',
                    boxShadow: '0 0 0 4px rgba(196,169,108,0.06), 0 16px 40px -18px rgba(196,169,108,0.4)',
                  }}
                >
                  {initial}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-cream-dim">Nome</label>
                <input className="input-field" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nome" maxLength={80} required />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-cream-dim">Email</label>
                <input type="email" className="input-field" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
              </div>
              <button type="submit" disabled={profileSaving} className="btn-primary w-full">
                {profileSaving ? 'Salvando…' : 'Salvar Alterações'}
              </button>
            </form>
          </Section>

          {/* Segurança */}
          <Section icon={<IconLock />} title="Segurança">
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <PasswordField label="Senha atual" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} placeholder="" />
              <PasswordField label="Nova senha" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="" />
              <PasswordField label="Confirmar nova senha" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="" />
              <button type="submit" disabled={passwordSaving} className="btn-primary w-full">
                {passwordSaving ? 'Atualizando…' : 'Atualizar Senha'}
              </button>
            </form>
          </Section>

          {/* Informações da Conta */}
          <Section icon={<IconInfo />} title="Informações da Conta">
            <div>
              <div className="info-row">
                <span className="info-row-label"><IconMail /> Email</span>
                <span className="info-row-value">{user?.email || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label"><IconCalendar /> Conta criada</span>
                <span className="info-row-value">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label"><IconId /> ID da conta</span>
                <span className="info-row-value font-mono text-[13px]">
                  {user?.id ? String(user.id).slice(0, 8) : '—'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-row-label"><IconShield /> Status</span>
                <span className="badge-active">Verificada</span>
              </div>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
