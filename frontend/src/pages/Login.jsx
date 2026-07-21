import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext.jsx';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Brand from '../components/ui/Brand.jsx';

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
      const user = await login(form);
      toast.success('Bem-vindo de volta!');
      const target = user?.role === 'admin'
        ? (from.startsWith('/admin') ? from : '/admin')
        : (from.startsWith('/admin') ? '/dashboard' : from);
      navigate(target, { replace: true });
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
      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-cream-dim transition hover:text-cream">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-cream-dim">
        Não tem conta?{' '}
        <Link to="/register" className="inline-flex min-h-11 items-center font-medium text-gold underline-offset-4 hover:underline">
          Criar agora
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="app-screen relative flex items-start justify-center overflow-x-hidden px-4 py-6 sm:items-center sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue/[0.06] blur-3xl" />
      <div className="relative z-10 w-full max-w-md animate-slideup">
        <div className="mb-6 flex justify-center sm:mb-8"><Brand to="/login" /></div>
        <div className="card p-5 sm:p-8">
          <p className="label-mono mb-3 text-gold">Seu evento, todos os olhares</p>
          <h1 className="font-serif text-4xl font-semibold leading-none tracking-tight sm:text-[44px]">{title}</h1>
          {subtitle && <p className="mb-7 mt-3 text-sm leading-relaxed text-cream-dim">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
