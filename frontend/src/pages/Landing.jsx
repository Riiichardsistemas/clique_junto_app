import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const STEPS = [
  { n: '01', t: 'Criar', d: 'Monte seu evento em minutos e personalize o filtro das fotos.' },
  { n: '02', t: 'Convidar', d: 'Compartilhe o QR Code. Convidados entram sem baixar nada.' },
  { n: '03', t: 'Revelar', d: 'No fim do evento, todas as memórias se revelam de uma vez.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen text-cream">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl tracking-wide">
            Era <span className="text-gold">Uma Vez</span>
          </span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary">Meu painel</Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-cream/70 transition hover:text-cream">Entrar</Link>
              <Link to="/register" className="btn-primary">Criar conta</Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <p className="label-mono mb-5 text-gold/80">Álbum colaborativo de fotos</p>
        <h1 className="font-serif text-5xl leading-[1.08] sm:text-6xl">
          Cada momento do seu evento,
          <br />
          <span className="italic text-gold">revelado no tempo certo.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/60">
          Crie um evento, gere um QR Code e deixe seus convidados fotografarem. As fotos ficam
          guardadas como uma câmera descartável digital — e se revelam todas juntas no fim.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary w-full sm:w-auto">Criar meu evento grátis</Link>
          <Link to="/login" className="btn-ghost w-full sm:w-auto">Já tenho conta</Link>
        </div>

        {/* Como funciona */}
        <section className="mt-24 grid gap-4 text-left sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="mb-4 font-serif text-2xl text-gold">{s.n}</div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/55">{s.d}</p>
            </div>
          ))}
        </section>

        {/* Citação / motivo de filme */}
        <section className="mt-20">
          <div className="mb-6 flex items-center justify-center gap-1 opacity-25">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="h-4 w-3 rounded-[1px] border border-cream/30" />
            ))}
          </div>
          <p className="mx-auto max-w-lg font-serif text-xl italic leading-relaxed text-cream/70">
            “As melhores fotos são as que você nem lembrava que existiam.”
          </p>
        </section>
      </main>

      <footer className="border-t border-cream/[0.06] py-8 text-center text-sm text-cream/35">
        © {new Date().getFullYear()} Era Uma Vez — Feito para guardar boas histórias.
      </footer>
    </div>
  );
}
