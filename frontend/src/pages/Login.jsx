import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Brand from '../components/ui/Brand.jsx';

/*
 * Tela de login em dois painéis, fiel ao mockup:
 * - Painel esquerdo: foto do evento desfocada + marca + tagline em serif.
 * - Painel direito: formulário com ícones, botão dourado e login social.
 * - Polaroids decorativos flutuando ao redor do cartão.
 *
 * Imagens (opcionais — há fallback em gradiente se não existirem):
 *   frontend/public/login-hero.jpg        → foto grande do painel esquerdo
 *   frontend/public/login-polaroid-1.jpg  → polaroid superior direito
 *   frontend/public/login-polaroid-2.jpg  → polaroid direito
 *   frontend/public/login-polaroid-3.jpg  → polaroid inferior central
 */

const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };

function Polaroid({ src, className = '', rotate = 0, size = 'h-[72px] w-[72px]' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-20 hidden rounded-[14px] border border-white/10 bg-[#141416] p-[5px] shadow-btn lg:block ${size} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="h-full w-full overflow-hidden rounded-[10px] bg-gradient-to-br from-[#2b2620] via-[#1c1a17] to-[#121112]">
        <img src={src} alt="" onError={hideOnError} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function SocialButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/[0.045] text-gold-light transition-all duration-250 hover:border-gold/40 hover:bg-gold/10 active:scale-95"
    >
      {children}
    </button>
  );
}

/* Ícones de marca (lucide não inclui logos) */
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const PlayStoreIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
    <path d="M3.61 1.81a1.5 1.5 0 0 0-.61 1.2v17.98a1.5 1.5 0 0 0 .61 1.2l.09.06L13.79 12.2v-.4L3.7 1.75l-.09.06zm11.5 11.71 2.6 2.6 3.44-1.95c.98-.56.98-1.47 0-2.03l-3.45-1.96-2.59 2.6-.34.37.34.37zM4.9 22.13l9.6-9.56 2.28 2.28-9.11 5.17c-.9.51-1.9.54-2.62.16l-.15-.05zm0-20.26.15-.05c.72-.38 1.72-.35 2.62.16l9.11 5.17-2.28 2.28L4.9 1.87z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
    <path d="M21.35 11.1H12v3.7h5.36c-.5 2.45-2.57 3.86-5.36 3.86a5.9 5.9 0 0 1 0-11.8c1.43 0 2.72.51 3.74 1.35l2.78-2.78A9.86 9.86 0 0 0 12 2.9a9.9 9.9 0 1 0 0 19.8c4.95 0 9.45-3.6 9.45-9.9 0-.58-.03-1.14-.1-1.7z"/>
  </svg>
);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const socialSoon = () => toast('Login social em breve!', { icon: '✨' });

  return (
    <div className="app-screen relative flex items-center justify-center overflow-x-hidden px-4 py-8 sm:px-6 lg:py-14">
      {/* Brilhos de fundo */}
      <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-gold/[0.05] blur-3xl" />

      <div className="relative z-10 w-full max-w-[1060px] animate-slideup">
        {/* Polaroids decorativos */}
        <Polaroid src="/login-polaroid-1.jpg" rotate={8}  className="-right-8 -top-8" />
        <Polaroid src="/login-polaroid-2.jpg" rotate={-6} className="-right-14 top-16" size="h-16 w-16" />
        <Polaroid src="/login-polaroid-3.jpg" rotate={-8} className="-bottom-9 left-[42%]" />

        {/* Chip com a marca, canto inferior esquerdo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -left-7 z-20 hidden h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-xl text-gold shadow-btn lg:flex"
          style={{ transform: 'rotate(-6deg)' }}
        >
          ✱
        </div>

        {/* Brilho de estrela, canto inferior direito */}
        <svg
          aria-hidden="true"
          viewBox="0 0 40 40"
          className="pointer-events-none absolute -bottom-10 -right-9 z-20 hidden h-10 w-10 text-cream/25 lg:block"
          fill="currentColor"
        >
          <path d="M20 2c1.2 8.6 3.2 12.1 6.1 15 2.9 2.9 6.4 4.9 11.9 6-8.6 1.2-12.1 3.2-15 6.1-2.9 2.9-4.9 6.4-6 11.9-1.2-8.6-3.2-12.1-6.1-15C8 23.1 4.5 21.1-1 20c8.6-1.2 12.1-3.2 15-6.1C16.9 11 18.9 7.5 20 2z" />
        </svg>

        {/* Cartão principal */}
        <div className="relative grid overflow-hidden rounded-[26px] border border-line shadow-float md:grid-cols-[1.08fr_1fr]">
          {/* ===== Painel esquerdo — foto + marca + tagline ===== */}
          <div className="relative hidden min-h-[560px] md:block">
            {/* Fallback em gradiente caso a foto não exista */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#26221c] via-[#171512] to-[#0d0c0b]" />
            <img
              src="/login-hero.jpg"
              alt=""
              onError={hideOnError}
              className="absolute inset-0 h-full w-full scale-[1.06] object-cover blur-[5px]"
            />
            {/* Véu escuro para legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/60" />
            <div className="absolute inset-0 film-grain opacity-30 mix-blend-soft-light" />

            <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
              <span aria-hidden="true" className="mb-2 text-[44px] leading-none text-gold">✱</span>
              <div className="mb-8 flex items-center gap-2.5">
                <span aria-hidden="true" className="text-[22px] font-extrabold leading-none text-gold">✱</span>
                <span className="font-serif text-[26px] font-bold tracking-tight text-cream">Clique Junto</span>
              </div>
              <h2 className="max-w-[17ch] font-serif text-[42px] font-semibold leading-[1.08] tracking-tight text-cream lg:text-[48px]">
                Capture seu dia pelos olhos <em className="italic text-gold-light">de todos.</em>
              </h2>
            </div>
          </div>

          {/* ===== Painel direito — formulário ===== */}
          <div className="relative bg-[#151517]/95 px-6 py-9 sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
            <div className="relative mx-auto w-full max-w-[380px]">
              {/* Marca visível apenas no mobile (o painel esquerdo some) */}
              <div className="mb-6 flex justify-center md:hidden"><Brand to="/login" /></div>

              <h1 className="font-serif text-[40px] font-semibold leading-none tracking-tight sm:text-[44px]">Entrar</h1>
              <p className="mb-8 mt-2.5 text-sm leading-relaxed text-cream-dim">Acesse o painel dos seus eventos</p>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm text-cream-dim">Email</label>
                  <div className="relative">
                    <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-cream-dim/70" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="voce@email.com"
                      value={form.email}
                      onChange={onChange}
                      required
                      autoComplete="email"
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm text-cream-dim">Senha</label>
                  <div className="relative">
                    <KeyRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-cream-dim/70" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="digite sua senha"
                      value={form.password}
                      onChange={onChange}
                      required
                      autoComplete="current-password"
                      className="input-field pl-11 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-cream-dim/70 transition hover:text-cream"
                    >
                      {showPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                {/* Botão dourado metálico */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full text-[15px] font-bold text-[#231a0d] transition-all duration-250 hover:brightness-105 active:scale-[0.985] disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(100deg, #a97f47 0%, #e6cd9d 26%, #f6e9c8 50%, #d2ad78 74%, #9d7440 100%)',
                    boxShadow: '0 0 26px rgba(210,173,120,.32), 0 10px 28px -12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.55)',
                  }}
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>

              {/* Divisor */}
              <div className="mt-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[13px] text-cream-dim">Ou entre com</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {/* Social */}
              <div className="mt-5 flex items-center justify-center gap-4">
                <SocialButton label="Entrar com Apple" onClick={socialSoon}><AppleIcon /></SocialButton>
                <SocialButton label="Entrar com Google Play" onClick={socialSoon}><PlayStoreIcon /></SocialButton>
                <SocialButton label="Entrar com Google" onClick={socialSoon}><GoogleIcon /></SocialButton>
              </div>

              <p className="mt-6 text-center text-sm">
                <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-cream-dim transition hover:text-cream">
                  Esqueci minha senha
                </Link>
              </p>
              <p className="text-center text-sm text-cream-dim">
                Não tem conta?{' '}
                <Link to="/register" className="inline-flex min-h-11 items-center font-medium text-gold underline-offset-4 hover:underline">
                  Criar agora
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Mantido para Register, ForgotPassword e ResetPassword */
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
