import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext.jsx';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Bem-vindo de volta!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse o painel dos seus eventos.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="voce@email.com"
          value={form.email}
          onChange={onChange}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          value={form.password}
          onChange={onChange}
          required
          autoComplete="current-password"
        />
        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">
        Não tem conta?{' '}
        <Link to="/register" className="text-gold hover:underline">
          Criar agora
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center font-serif text-xl">
          ERA <span className="text-gold">UMA VEZ</span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-surface p-8">
          <h1 className="font-serif text-3xl">{title}</h1>
          {subtitle && <p className="mb-6 mt-1 text-sm text-white/60">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
