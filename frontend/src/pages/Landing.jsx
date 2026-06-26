import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-serif text-xl tracking-wide">
          ERA <span className="text-gold">UMA VEZ</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary">
              Meu painel
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-white/80 hover:text-white">
                Entrar
              </Link>
              <Link to="/register" className="btn-primary">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-gold/80">
          Álbum colaborativo de fotos
        </p>
        <h1 className="font-serif text-5xl leading-tight sm:text-6xl">
          Cada momento do seu evento,
          <br />
          <span className="italic text-gold">revelado no tempo certo.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          Crie um evento, gere um QR Code e deixe seus convidados fotografarem. As fotos ficam
          guardadas como uma câmera descartável digital — e se revelam todas juntas no fim.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary w-full sm:w-auto">
            Criar meu evento grátis
          </Link>
          <Link to="/login" className="btn-ghost w-full sm:w-auto">
            Já tenho conta
          </Link>
        </div>

        {/* Como funciona */}
        <section className="mt-24 grid gap-8 text-left sm:grid-cols-3">
          {[
            { n: '01', t: 'Criar', d: 'Monte seu evento em minutos e personalize o filtro das fotos.' },
            { n: '02', t: 'Convidar', d: 'Compartilhe o QR Code. Convidados entram sem baixar nada.' },
            { n: '03', t: 'Revelar', d: 'No fim do evento, todas as memórias se revelam de uma vez.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-surface p-6">
              <div className="mb-3 font-serif text-2xl text-gold">{s.n}</div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-white/60">{s.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/40">
        © {new Date().getFullYear()} ERA UMA VEZ — Feito para guardar boas histórias.
      </footer>
    </div>
  );
}
