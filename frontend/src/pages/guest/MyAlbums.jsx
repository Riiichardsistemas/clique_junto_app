import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { guestApi } from '../../api/guestApi';
import { photoApi } from '../../api/photoApi';

const GUEST_TOKEN_PREFIX = 'euv_guest_';

// Slugs de todos os eventos que este navegador já participou
function getJoinedSlugs() {
  const slugs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(GUEST_TOKEN_PREFIX)) slugs.push(key.slice(GUEST_TOKEN_PREFIX.length));
  }
  return slugs;
}

function formatEventDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Contagem regressiva compacta ("2d", "5h", "32min")
function shortCountdown(revealAt, now) {
  if (!revealAt) return null;
  const diff = new Date(revealAt).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.floor(diff / 60000))}min`;
}

function LockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * Capa do álbum no estilo iOS Photos:
 * - Revelado: foto de capa (primeira do evento)
 * - Bloqueado: mosaico borrado + cadeado + countdown
 */
function AlbumCard({ album, now }) {
  const { event, stats, cover, revealed, error } = album;
  const countdown = shortCountdown(event?.revealAt, now);
  const count = stats?.photoCount ?? 0;

  return (
    <Link
      to={`/e/${event.slug}/album`}
      className="group block animate-fadein text-left"
    >
      {/* Capa quadrada, cantos arredondados — assinatura visual do iOS */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-cream/[0.07] bg-surface-2">
        {revealed && cover ? (
          cover.mediaType === 'video' ? (
            <video src={cover.url} muted playsInline preload="metadata"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          ) : (
            <img src={cover.thumbUrl || cover.url} alt={event.name} loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          )
        ) : (
          <div className="relative h-full w-full">
            {/* Mosaico de "fotos guardadas" borrado */}
            <div className="grid h-full w-full grid-cols-3 gap-px opacity-60 blur-[1px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="animate-pulse-slow bg-cream/[0.05]"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gold/80">
              <LockIcon size={22} />
              {countdown && (
                <span className="rounded-full bg-ink/70 px-2.5 py-0.5 font-mono text-[11px] text-cream/70 backdrop-blur-sm">
                  revela em {countdown}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Badge de contagem (canto inferior direito, como no iOS ao selecionar) */}
        {count > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-cream/80 backdrop-blur-sm">
            {count}
          </span>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60 text-xs text-cream/40">
            indisponível
          </div>
        )}
      </div>

      {/* Legenda: nome + subtítulo cinza, tipografia iOS */}
      <p className="mt-2 truncate text-[15px] font-medium leading-tight text-cream">{event.name}</p>
      <p className="mt-0.5 truncate text-[13px] text-cream/40">
        {formatEventDate(event.startsAt) || (revealed ? 'Revelado' : 'Em revelação')}
        {count > 0 && ` · ${count} ${count === 1 ? 'item' : 'itens'}`}
      </p>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cream/10 bg-cream/[0.04] text-cream/30">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" />
        </svg>
      </div>
      <p className="font-serif text-2xl text-cream/70">Nenhum álbum ainda</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-cream/35">
        Quando você entrar em um evento pelo QR Code ou link, o álbum dele aparece aqui.
      </p>
    </div>
  );
}

export default function MyAlbums() {
  const [albums, setAlbums] = useState(null); // null = carregando
  const [now, setNow] = useState(Date.now());

  // Relógio para os countdowns dos álbuns bloqueados
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAlbum(slug) {
      try {
        const ed = await guestApi.getEvent(slug);
        const event = ed.event;
        const revealed = !!event.isRevealed;
        let cover = null;
        let photoCount = ed.stats?.photoCount ?? 0;

        if (revealed && photoCount > 0) {
          try {
            const pd = await photoApi.listForEvent(event.id, { limit: 1 });
            cover = pd.photos?.[0] || null;
            photoCount = pd.total ?? photoCount;
          } catch { /* capa é opcional */ }
        }

        return { slug, event, revealed, cover, stats: { photoCount } };
      } catch {
        // Evento apagado/indisponível: não exibe
        return null;
      }
    }

    (async () => {
      const slugs = getJoinedSlugs();
      const results = await Promise.all(slugs.map(loadAlbum));
      if (cancelled) return;
      const valid = results
        .filter(Boolean)
        // Mais recentes primeiro (como Eventos do iOS)
        .sort((a, b) => new Date(b.event.startsAt || 0) - new Date(a.event.startsAt || 0));
      setAlbums(valid);
    })();

    return () => { cancelled = true; };
  }, []);

  const revealedAlbums = (albums || []).filter((a) => a.revealed);
  const lockedAlbums = (albums || []).filter((a) => !a.revealed);

  return (
    <div className="min-h-screen bg-ink-deep pb-16 text-cream">
      {/* Header estilo iOS: label pequeno + large title */}
      <header className="px-5 pb-2 pt-10">
        <p className="label-mono text-gold/70">Era Uma Vez</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight">Álbuns</h1>
      </header>

      {albums === null ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
        </div>
      ) : albums.length === 0 ? (
        <EmptyState />
      ) : (
        <main className="px-5">
          {/* Seção: em revelação (bloqueados) */}
          {lockedAlbums.length > 0 && (
            <section className="mt-6">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Em revelação</h2>
                <span className="text-[13px] text-cream/35">{lockedAlbums.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                {lockedAlbums.map((a) => <AlbumCard key={a.slug} album={a} now={now} />)}
              </div>
            </section>
          )}

          {/* Seção: revelados */}
          {revealedAlbums.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Meus eventos</h2>
                <span className="text-[13px] text-cream/35">{revealedAlbums.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                {revealedAlbums.map((a) => <AlbumCard key={a.slug} album={a} now={now} />)}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
