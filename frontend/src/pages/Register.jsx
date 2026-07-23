import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, UserRound, Gift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { AuthSplit, AuthField, AuthPasswordField, GoldButton } from './Login';

/*
 * Cadastro com a mesma identidade visual do Login:
 * usa o layout AuthSplit e os campos compartilhados exportados por Login.jsx.
 */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = (searchParams.get('ref') || '').trim();

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
      const user = await register(ref ? { ...form, ref } : form);
      toast.success('Conta criada com sucesso!');
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit title="Criar conta" subtitle="Comece a guardar memórias dos seus eventos">
      {ref && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
          <Gift size={18} className="shrink-0 text-gold" />
          <p className="text-sm text-cream">
            Você foi <span className="font-semibold text-gold-light">indicado por um amigo</span>. Bem-vindo!
          </p>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField
          id="name"
          name="name"
          type="text"
          label="Nome"
          icon={UserRound}
          placeholder="Seu nome"
          value={form.name}
          onChange={onChange}
          required
          autoComplete="name"
        />
        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          placeholder="voce@email.com"
          value={form.email}
          onChange={onChange}
          required
          autoComplete="email"
        />
        <AuthPasswordField
          id="password"
          name="password"
          placeholder="mínimo 6 caracteres"
          value={form.password}
          onChange={onChange}
          required
          autoComplete="new-password"
        />
        <GoldButton loading={loading} loadingLabel="Criando conta…">Criar conta grátis</GoldButton>
      </form>

      <p className="mt-6 text-center text-sm text-cream/70">
        Já tem conta?{' '}
        <Link to="/login" className="inline-flex min-h-10 items-center font-medium text-gold underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthSplit>
  );
}
