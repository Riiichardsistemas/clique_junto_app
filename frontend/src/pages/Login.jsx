import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Brand from '../components/ui/Brand.jsx';
import LogoMark from '../components/ui/LogoMark.jsx';

/*
 * Tela de autenticação em dois painéis, fiel ao mockup:
 * - Painel esquerdo: foto do evento desfocada + marca + tagline em serif.
 * - Painel direito: formulário com ícones e botão dourado.
 * - Polaroids decorativos flutuando ao redor do cartão.
 *
 * O layout (AuthSplit) e os campos são compartilhados por Login e Register,
 * garantindo identidade visual idêntica entre as duas telas.
 *
 * Imagens (opcionais — há fallback em gradiente se não existirem):
 *   frontend/public/login-hero.webp → foto dos noivos (painel esquerdo e polaroid inferior)
 *   frontend/public/couple.webp     → foto do brinde (polaroids do canto direito)
 */

const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };

function Polaroid({ src, className = '', rotate = 0, size = 'h-[72px] w-[72px]', position = 'center' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-20 hidden rounded-[14px] border border-white/10 bg-[#141416] p-[5px] shadow-btn lg:block ${size} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="h-full w-full overflow-hidden rounded-[10px] bg-gradient-to-br from-[#2b2620] via-[#1c1a17] to-[#121112]">
        <img src={src} alt="" onError={hideOnError} className="h-full w-full object-cover" style={{ objectPosition: position }} />
      </div>
    </div>
  );
}

/* ===== Layout compartilhado — dois painéis + decoração ===== */
export function AuthSplit({ title, subtitle, children }) {
  return (
    <div
      className="relative flex h-[100dvh] justify-center overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-16"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* ===== Mobile: a foto do evento vira o fundo da tela inteira =====
          Espelha o painel esquerdo do desktop, que some abaixo de md. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 md:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#26221c] via-[#171512] to-[#0d0c0b]" />
        <img
          src="/login-hero.webp"
          alt=""
          onError={hideOnError}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[6px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/72 to-black/92" />
        <div className="absolute inset-0 film-grain opacity-30 mix-blend-soft-light" />
      </div>

      {/* Brilhos de fundo — só no desktop, para não competir com a foto no mobile */}
      <div className="pointer-events-none fixed left-1/2 top-[-16rem] hidden h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue/[0.05] blur-3xl md:block" />
      <div className="pointer-events-none fixed bottom-[-12rem] right-[-8rem] hidden h-[28rem] w-[28rem] rounded-full bg-gold/[0.05] blur-3xl md:block" />

      {/* my-auto: centraliza quando cabe, encosta no topo quando não cabe (evita corte) */}
      <div className="relative z-10 my-auto w-full max-w-[1060px] shrink-0 animate-slideup">
        {/* ===== Cabeçalho mobile sobre a foto — marca + tagline ===== */}
        <div className="mb-6 flex flex-col items-center text-center md:hidden">
          <LogoMark className="mb-3 h-[52px] w-[52px] drop-shadow-[0_3px_14px_rgba(0,0,0,.85)]" />
          <div className="mb-3.5 flex items-center gap-2 [text-shadow:0_1px_10px_rgba(0,0,0,.85)]">
            <span className="font-serif text-[19px] font-bold tracking-tight text-cream">Clique Junto</span>
          </div>
          {/* text-shadow: a serif fina sobre a foto precisa de separação do fundo */}
          <h2 className="max-w-[16ch] font-serif text-[27px] font-semibold leading-[1.18] tracking-tight text-cream [text-shadow:0_2px_14px_rgba(0,0,0,.9)]">
            Capture seu dia pelos olhos <em className="italic text-gold-light">de todos.</em>
          </h2>
        </div>

        {/* Polaroids decorativos */}
        <Polaroid src="/couple.webp"     rotate={8}  className="-right-8 -top-8" position="center 30%" />
        <Polaroid src="/couple.webp"     rotate={-6} className="-right-14 top-16" size="h-16 w-16" position="70% center" />
        <Polaroid src="/login-hero.webp" rotate={-8} className="-bottom-9 left-[42%]" position="center 35%" />

        {/* Chip com a marca, canto inferior esquerdo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -left-7 z-20 hidden h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 shadow-btn lg:flex"
          style={{ transform: 'rotate(-6deg)' }}
        >
          <LogoMark className="h-7 w-7" />
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
        <div className="relative grid overflow-hidden rounded-[26px] border border-white/[0.14] shadow-float md:grid-cols-[1.08fr_1fr] md:border-line">
          {/* ===== Painel esquerdo — foto + marca + tagline ===== */}
          <div className="relative hidden min-h-[480px] md:block lg:min-h-[540px]">
            {/* Fallback em gradiente caso a foto não exista */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#26221c] via-[#171512] to-[#0d0c0b]" />
            <img
              src="/login-hero.webp"
              alt=""
              onError={hideOnError}
              className="absolute inset-0 h-full w-full scale-[1.06] object-cover blur-[5px]"
            />
            {/* Véu escuro para legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/60" />
            <div className="absolute inset-0 film-grain opacity-30 mix-blend-soft-light" />

            <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
              <LogoMark className="mb-4 h-[62px] w-[62px] drop-shadow-[0_3px_16px_rgba(0,0,0,.7)]" />
              <div className="mb-7 flex items-center gap-2.5 [text-shadow:0_1px_10px_rgba(0,0,0,.7)]">
                <span className="font-serif text-[26px] font-bold tracking-tight text-cream">Clique Junto</span>
              </div>
              <h2 className="max-w-[17ch] font-serif text-[36px] font-semibold leading-[1.14] tracking-tight text-cream [text-shadow:0_2px_16px_rgba(0,0,0,.8)] lg:text-[44px]">
                Capture seu dia pelos olhos <em className="italic text-gold-light">de todos.</em>
              </h2>
            </div>
          </div>

          {/* ===== Painel direito — formulário ===== */}
          <div className="relative bg-[#141416]/82 px-6 py-7 backdrop-blur-2xl sm:px-10 sm:py-10 md:bg-[#151517]/95 md:backdrop-blur-none">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent md:from-white/[0.03]" />
            <div className="relative mx-auto w-full max-w-[380px]">
              <h1 className="font-serif text-[30px] font-semibold leading-none tracking-tight sm:text-[40px]">{title}</h1>
              <p className="mb-6 mt-2 text-[15px] leading-relaxed text-cream/70">{subtitle}</p>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Campos compartilhados — mesmo visual nas duas telas ===== */
export function AuthField({ id, label, icon: Icon, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-cream/85">{label}</label>
      <div className="relative">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-cream/55" />
        <input id={id} className="input-field pl-11" {...props} />
      </div>
    </div>
  );
}

export function AuthPasswordField({ id, label = 'Senha', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-cream/85">{label}</label>
      <div className="relative">
        <KeyRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-cream/55" />
        <input id={id} type={show ? 'text' : 'password'} className="input-field pl-11 pr-12" {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-cream/60 transition hover:text-cream"
        >
          {show ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}

/* Botão dourado metálico */
export function GoldButton({ loading, loadingLabel = 'Aguarde…', children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full text-[15px] font-bold text-[#231a0d] transition-all duration-250 hover:brightness-105 active:scale-[0.985] disabled:opacity-60"
      style={{
        background: 'linear-gradient(100deg, #a97f47 0%, #e6cd9d 26%, #f6e9c8 50%, #d2ad78 74%, #9d7440 100%)',
        boxShadow: '0 0 26px rgba(210,173,120,.32), 0 10px 28px -12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.55)',
      }}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

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
    <AuthSplit title="Entrar" subtitle="Acesse o painel dos seus eventos">
      <form onSubmit={onSubmit} className="space-y-4">
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
          placeholder="digite sua senha"
          value={form.password}
          onChange={onChange}
          required
          autoComplete="current-password"
        />
        <GoldButton loading={loading} loadingLabel="Entrando…">Entrar</GoldButton>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/forgot-password" className="inline-flex min-h-10 items-center font-medium text-cream/75 transition hover:text-cream">
          Esqueci minha senha
        </Link>
      </p>
      <p className="text-center text-sm text-cream/70">
        Não tem conta?{' '}
        <Link to="/register" className="inline-flex min-h-10 items-center font-medium text-gold underline-offset-4 hover:underline">
          Criar agora
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-cream/45">
        <Link to="/privacidade" className="underline-offset-4 transition hover:text-cream/70 hover:underline">
          Política de Privacidade
        </Link>
      </p>
    </AuthSplit>
  );
}

/* Mantido para ForgotPassword e ResetPassword */
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
