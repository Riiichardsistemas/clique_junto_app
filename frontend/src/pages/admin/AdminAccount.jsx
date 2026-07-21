import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/authApi';
import { formatDate } from '../../utils/admin';

export default function AdminAccount() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    if (!profile.name.trim()) return toast.error('Informe seu nome.');
    setProfileSaving(true);
    try {
      const data = await authApi.updateMe({ name: profile.name.trim(), email: profile.email.trim() });
      setUser(data.user);
      setProfile({ name: data.user.name, email: data.user.email });
      toast.success('Perfil administrativo atualizado.');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Não foi possível atualizar o perfil.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (password.newPassword.length < 6) return toast.error('A nova senha precisa ter pelo menos 6 caracteres.');
    if (password.newPassword !== password.confirmPassword) return toast.error('A confirmação da senha não confere.');
    setPasswordSaving(true);
    try {
      await authApi.updateMe({ currentPassword: password.currentPassword, password: password.newPassword });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Senha atualizada com segurança.');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Não foi possível atualizar a senha.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <AdminLayout title="Minha conta" description="Atualize apenas os dados da sua identidade administrativa e as credenciais de acesso.">
      <div className="grid gap-6 xl:grid-cols-[1fr,1fr,.75fr]">
        <section className="card p-5 sm:p-6">
          <div className="card-section-header"><UserRound /><span className="card-section-title">Perfil administrativo</span></div>
          <div className="mb-6 flex items-center gap-4 rounded-2xl border border-line bg-white/[0.018] p-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 font-serif text-xl text-gold">{(user?.name || 'A').charAt(0).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate font-semibold text-cream">{user?.name}</p><p className="mt-1 truncate text-xs text-cream-dim">Acesso de super admin</p></div>
          </div>
          <form className="space-y-4" onSubmit={saveProfile}>
            <Input id="admin-name" label="Nome" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} required maxLength={80} autoComplete="name" />
            <Input id="admin-email" label="Email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required autoComplete="email" />
            <Button type="submit" loading={profileSaving} className="w-full"><Save size={15} /> Salvar perfil</Button>
          </form>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="card-section-header"><KeyRound /><span className="card-section-title">Senha e segurança</span></div>
          <form className="space-y-4" onSubmit={savePassword}>
            <Input id="admin-current-password" label="Senha atual" type="password" value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} required autoComplete="current-password" />
            <Input id="admin-new-password" label="Nova senha" type="password" value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} required autoComplete="new-password" />
            <Input id="admin-confirm-password" label="Confirmar nova senha" type="password" value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} required autoComplete="new-password" />
            <p className="text-xs leading-5 text-cream-dim">Use uma senha exclusiva. A alteração passa a valer imediatamente para os próximos acessos.</p>
            <Button type="submit" loading={passwordSaving} className="w-full"><KeyRound size={15} /> Atualizar senha</Button>
          </form>
        </section>

        <section className="card h-fit p-5 sm:p-6">
          <div className="card-section-header"><ShieldCheck /><span className="card-section-title">Identidade de acesso</span></div>
          <Info icon={Mail} label="Email" value={user?.email} />
          <Info icon={CalendarDays} label="Conta criada" value={formatDate(user?.createdAt)} />
          <Info icon={ShieldCheck} label="Permissão" value="Super admin" />
          <div className="mt-5 rounded-2xl border border-success/15 bg-success/[0.045] p-4 text-xs leading-5 text-cream-dim">
            <p className="font-semibold text-success">Conta protegida</p>
            <p className="mt-1">Este acesso é exclusivo para administração e não abre funcionalidades de organizador.</p>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3 border-t border-line/60 py-3.5 first:border-0"><Icon size={15} className="mt-0.5 shrink-0 text-gold" /><div className="min-w-0"><p className="text-xs text-cream-dim">{label}</p><p className="mt-1 break-words text-sm text-cream">{value || '—'}</p></div></div>;
}
