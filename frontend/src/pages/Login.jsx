import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Aperture } from 'lucide-react';
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
      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-cream-dim transition hover:text-cream">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-cream-dim">
        Não tem conta?{' '}
        <Link to="/register" className="font-medium text-gold underline-offset-4 hover:underline">
          Criar agora
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      {/* Grid decorativo de fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(196,169,108,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(196,169,108,0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 40%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 40%, black 30%, transparent 75%)',
        }}
      />
      <div className="relative z-10 w-full max-w-md animate-slideup">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08]">
            <Aperture size={17} className="text-gold" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">Clique Junto</span>
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mb-6 mt-2 text-sm text-cream-dim">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
