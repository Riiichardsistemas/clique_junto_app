import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { authApi } from '../api/authApi';
import { AuthShell } from './Login';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Informe seu email.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Email enviado!">
        <div className="text-center">
          <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <MailCheck size={24} className="text-emerald-400" />
          </span>
          <p className="text-sm leading-relaxed text-cream-dim">
            Se este email estiver cadastrado, você receberá um link para redefinir sua senha em breve.
          </p>
          <Link to="/login" className="btn-ghost mt-6 w-full">
            Voltar para o login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe seu email e enviaremos um link para redefinir a senha."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          autoFocus
        />

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Enviando…' : 'Enviar link'}
        </Button>

        <Link to="/login" className="block text-center text-sm text-cream-dim transition hover:text-cream">
          Voltar para o login
        </Link>
      </form>
    </AuthShell>
  );
}
