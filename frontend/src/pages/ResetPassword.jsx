import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { AuthShell } from './Login';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (!token) { setError('Token inválido. Solicite um novo link.'); return; }

    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      toast.success('Senha redefinida! Faça login.');
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.error || 'Token inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma senha com pelo menos 6 caracteres.">
      {!token ? (
        <div className="text-center">
          <p className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            Link inválido ou expirado.
          </p>
          <Link to="/forgot-password" className="btn-primary w-full">
            Solicitar novo link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="password"
            type="password"
            label="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoFocus
          />
          <Input
            id="confirm"
            type="password"
            label="Confirmar senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
          />

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Salvando…' : 'Redefinir senha'}
          </Button>

          <Link to="/login" className="block text-center text-sm text-cream-dim transition hover:text-cream">
            Voltar para o login
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
