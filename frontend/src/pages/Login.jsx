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
      <p className="mt-6 text-center text-sm text-cream/55">
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="film-grain pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="relative z-10 w-full max-w-md animate-slideup">
        <Link to="/" className="mb-8 block text-center font-serif text-xl">
          Era <span className="text-gold">Uma Vez</span>
        </Link>
        <div className="card p-8">
          <h1 className="font-serif text-3xl">{title}</h1>
          {subtitle && <p className="mb-6 mt-1.5 text-sm text-cream/50">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
