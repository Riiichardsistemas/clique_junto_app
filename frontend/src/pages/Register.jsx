import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext.jsx';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { AuthShell } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Conta criada com sucesso!');
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Criar conta" subtitle="Comece a guardar memórias dos seus eventos.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="name"
          name="name"
          label="Nome"
          placeholder="Seu nome"
          value={form.name}
          onChange={onChange}
          required
          autoComplete="name"
        />
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
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={onChange}
          required
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full">
          Criar conta grátis
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-cream/55">
        Já tem conta?{' '}
        <Link to="/login" className="inline-flex min-h-11 min-w-11 items-center justify-center text-gold hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
