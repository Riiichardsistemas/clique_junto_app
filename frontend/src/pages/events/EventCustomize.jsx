import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft, Monitor, Copy, ExternalLink, Image as ImageIcon, Palette,
  MessageSquare, UploadCloud, Loader2, Radio, LayoutTemplate, MapPin, Star,
} from 'lucide-react';
import { eventApi } from '../../api/eventApi';

const PRESET_COLORS = ['#C4A96C', '#E8B4B8', '#7EA4A0', '#8E7CC3', '#D98C5F', '#5B7DB1', '#B5654A', '#3F4A3C'];

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/15 border-t-cream/60" />
    </div>
  );
}

export default function EventCustomize() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // 'cover' | 'logo' | null

  const [themeColor, setThemeColor] = useState('#C4A96C');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [liveWall, setLiveWall] = useState(false);
  const [entryTemplate, setEntryTemplate] = useState('classic');
  const [venueName, setVenueName] = useState('');

  const coverInput = useRef(null);
  const logoInput = useRef(null);
  const inviteInputs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    eventApi.getOne(id)
      .then((d) => {
        setEvent(d.event);
        setThemeColor(d.event.themeColor || '#C4A96C');
        setWelcomeMessage(d.event.welcomeMessage || '');
        setLiveWall(!!d.event.liveWallEnabled);
        setEntryTemplate(d.event.entryTemplate || 'classic');
        setVenueName(d.event.venueName || '');
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const telaoUrl = event?.slideshowKey ? `${window.location.origin}/telao/${event.slideshowKey}` : '';

  async function handleUpload(slot, file) {
    if (!file) return;
    setUploading(slot);
    try {
      const d = await eventApi.uploadBrandingImage(id, slot, file);
      setEvent(d.event);
      const msg = { cover: 'Capa atualizada!', logo: 'Logo atualizado!' };
      toast.success(msg[slot] || 'Foto do convite atualizada!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao enviar imagem.');
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const d = await eventApi.update(id, {
        themeColor, welcomeMessage, liveWallEnabled: liveWall,
        entryTemplate, venueName: venueName.trim() || null,
      });
      setEvent(d.event);
      toast.success('Personalização salva!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleLive(next) {
    setLiveWall(next);
    try {
      const d = await eventApi.update(id, { liveWallEnabled: next });
      setEvent(d.event);
      toast.success(next ? 'Telão ao vivo ligado.' : 'Telão ao vivo desligado.');
    } catch {
      setLiveWall(!next);
      toast.error('Erro ao atualizar.');
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(telaoUrl).then(() => toast.success('Link copiado!'));
  }

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen text-cream">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
          <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-cream-dim transition hover:text-cream">
            <ChevronLeft size={16} /> Voltar ao evento
          </Link>
          <span className="label-mono">Personalização</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl">Personalizar “{event?.name}”</h1>

        {/* ---------- TELÃO ---------- */}
        <section className="card p-6">
          <div className="card-section-header"><Monitor /><span className="card-section-title">Telão da festa</span></div>

          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] p-3.5 sm:gap-4 sm:p-4">
            <div className="flex items-start gap-3">
              <Radio size={18} className="mt-0.5 text-gold" />
              <div>
                <p className="text-sm font-medium text-cream">Modo ao vivo</p>
                <p className="text-xs text-cream-dim">Exibe as fotos no telão assim que os convidados tiram, antes da revelação. Desligado, o telão só roda após a revelação.</p>
              </div>
            </div>
            <button onClick={() => toggleLive(!liveWall)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${liveWall ? 'bg-gold' : 'bg-white/15'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${liveWall ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <label className="mb-1.5 block text-sm font-medium text-cream-dim">Link do telão (secreto)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={telaoUrl} className="input-field min-w-0 flex-1 text-xs" onFocus={(e) => e.target.select()} />
            <div className="flex gap-2">
              <button onClick={copyLink} className="btn-ghost btn-sm flex-1 sm:flex-none" title="Copiar"><Copy size={14} /><span className="sm:hidden"> Copiar</span></button>
              <a href={telaoUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm flex-1 sm:flex-none" title="Abrir telão">
                <ExternalLink size={14} /> Abrir
              </a>
            </div>
          </div>
          <p className="mt-2 text-xs text-cream-dim">Abra este link em qualquer TV ou notebook no local. Não precisa fazer login. Roda sozinho como apresentação.</p>
        </section>

        {/* ---------- MODELO DA PÁGINA DE ENTRADA ---------- */}
        <section className="card p-6">
          <div className="card-section-header"><LayoutTemplate /><span className="card-section-title">Modelo da página de entrada</span></div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {/* Clássico */}
            <button onClick={() => setEntryTemplate('classic')}
              className={`overflow-hidden rounded-xl border-2 text-left transition ${entryTemplate === 'classic' ? 'border-gold' : 'border-line hover:border-gold/40'}`}>
              <div className="flex h-28 flex-col items-center justify-center gap-1.5 bg-[#14110b] sm:h-32">
                <span className="h-1.5 w-12 rounded-full bg-white/20" />
                <span className="h-2.5 w-20 rounded-full bg-white/40" />
                <span className="mt-1 h-6 w-24 rounded-lg border border-white/10 bg-white/[0.06]" />
                <span className="h-5 w-24 rounded-lg" style={{ background: themeColor }} />
              </div>
              <p className="px-3 py-2 text-xs font-medium text-cream">Clássico <span className="font-normal text-cream-dim">— escuro</span></p>
            </button>

            {/* Convite */}
            <button onClick={() => setEntryTemplate('convite')}
              className={`overflow-hidden rounded-xl border-2 text-left transition ${entryTemplate === 'convite' ? 'border-gold' : 'border-line hover:border-gold/40'}`}>
              <div className="relative flex h-28 flex-col items-center justify-center gap-1.5 bg-[#f2ead9] sm:h-32">
                <span className="absolute left-1/2 top-3 h-10 w-9 -translate-x-[62%] -rotate-6 rounded-sm bg-white shadow-md" />
                <span className="absolute left-1/2 top-4 h-10 w-9 -translate-x-[30%] rotate-3 rounded-sm bg-white shadow-md" />
                <span className="absolute left-1/2 top-11 -translate-x-[10%] rotate-6 rounded-sm px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wider text-white" style={{ background: themeColor }}>convite ★</span>
                <span className="mt-12 h-2.5 w-16 rounded-full bg-[#2b241a]/70" />
                <span className="h-5 w-24 rounded-lg bg-[#2b241a]" />
              </div>
              <p className="px-3 py-2 text-xs font-medium text-cream">Convite <span className="font-normal text-cream-dim">— polaroids</span></p>
            </button>
          </div>

          {entryTemplate === 'convite' && (
            <div className="space-y-5 border-t border-line/60 pt-5">
              {/* Local */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-cream-dim">
                  <MapPin size={14} /> Local do evento
                </label>
                <input className="input-field" value={venueName} maxLength={60}
                  onChange={(e) => setVenueName(e.target.value)} placeholder="Ex.: Quinta do Vale" />
                <p className="mt-1.5 text-xs text-cream-dim/70">
                  Aparece junto da data: “{event?.startsAt
                    ? new Date(event.startsAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
                    : '14 de junho'} · {venueName.trim() || 'Local do evento'}”
                </p>
              </div>

              {/* Fotos do convite */}
              <div>
                <label className="mb-2 block text-sm font-medium text-cream-dim">Fotos do convite (até 3 polaroids)</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[1, 2, 3].map((n, i) => {
                    const url = event?.[`invitePhoto${n}Url`];
                    const slot = `invite${n}`;
                    return (
                      <div key={n}>
                        <button onClick={() => inviteInputs[i].current?.click()} disabled={uploading === slot}
                          className={`relative block aspect-[4/5] w-full overflow-hidden rounded-lg border bg-white/[0.02] p-1.5 transition hover:border-gold/40 ${url ? 'border-line' : 'border-dashed border-line'}`}
                          style={{ transform: `rotate(${[-3, 2, -1][i]}deg)` }}>
                          <span className="flex h-[82%] w-full items-center justify-center overflow-hidden rounded-sm bg-black/30">
                            {uploading === slot
                              ? <Loader2 size={16} className="animate-spin text-cream-dim" />
                              : url
                                ? <img src={url} alt={`Foto ${n}`} className="h-full w-full object-cover" />
                                : <UploadCloud size={16} className="text-cream-dim" />}
                          </span>
                          <span className="mt-1 block text-center text-[9px] text-cream-dim">{url ? 'trocar' : `foto ${n}`}</span>
                        </button>
                        <input ref={inviteInputs[i]} type="file" accept="image/*" hidden
                          onChange={(e) => { handleUpload(slot, e.target.files?.[0]); e.target.value = ''; }} />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-cream-dim/70">A primeira foto fica em destaque. Sem fotos, usamos a capa.</p>
              </div>

              {/* Prévia */}
              <div>
                <p className="label-mono mb-2 text-cream-dim/70">Prévia</p>
                <div className="overflow-hidden rounded-xl border border-line bg-[#f2ead9] px-4 pb-5 pt-4 text-center text-[#2b241a]">
                  <p className="font-serif text-xs italic text-[#2b241a]/70">Clique Junto</p>
                  <div className="relative mx-auto mt-2 h-24 w-32">
                    {(event?.invitePhoto2Url || event?.invitePhoto3Url) && (
                      <span className="absolute left-1/2 top-1 h-20 w-[4.5rem] -translate-x-[80%] -rotate-6 overflow-hidden rounded-sm bg-white p-1 shadow-md">
                        <img src={event?.invitePhoto2Url || event?.invitePhoto3Url} alt="" className="h-full w-full object-cover" />
                      </span>
                    )}
                    <span className="absolute left-1/2 top-0 h-[5.5rem] w-20 -translate-x-[35%] rotate-3 overflow-hidden rounded-sm bg-white p-1 shadow-lg">
                      {(event?.invitePhoto1Url || event?.coverImageUrl)
                        ? <img src={event?.invitePhoto1Url || event?.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        : <span className="flex h-full w-full items-center justify-center bg-[#e5dcc8]"><ImageIcon size={16} className="text-[#2b241a]/30" /></span>}
                    </span>
                    <span className="absolute bottom-0 left-1/2 flex translate-x-[10%] rotate-6 items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white shadow" style={{ background: themeColor }}>
                      convite <Star size={6} fill="currentColor" />
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: themeColor }}>Você foi convidado para</p>
                  <p className="font-serif text-lg font-semibold leading-tight">{event?.name || 'Nome do evento'}</p>
                  <p className="text-[10px] text-[#2b241a]/60">
                    {event?.startsAt ? new Date(event.startsAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : ''}
                    {event?.startsAt && venueName.trim() ? ' · ' : ''}{venueName.trim()}
                  </p>
                  <span className="mt-2 inline-block rounded-lg bg-[#2b241a] px-5 py-1.5 text-[10px] font-semibold text-[#f2ead9]">Entrar no filme →</span>
                </div>
              </div>
            </div>
          )}

          <button onClick={save} disabled={saving} className="btn-primary mt-5 w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar modelo'}
          </button>
        </section>

        {/* ---------- IDENTIDADE VISUAL ---------- */}
        <section className="card p-6">
          <div className="card-section-header"><Palette /><span className="card-section-title">Identidade visual da página de entrada</span></div>

          {/* Capa */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-cream-dim">Imagem de fundo / capa</label>
            <div className="overflow-hidden rounded-xl border border-line">
              {event?.coverImageUrl ? (
                <img src={event.coverImageUrl} alt="capa" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-white/[0.02] text-cream-dim">
                  <ImageIcon size={28} />
                </div>
              )}
            </div>
            <input ref={coverInput} type="file" accept="image/*" hidden
              onChange={(e) => handleUpload('cover', e.target.files?.[0])} />
            <button onClick={() => coverInput.current?.click()} disabled={uploading === 'cover'}
              className="btn-ghost btn-sm mt-3">
              {uploading === 'cover' ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {event?.coverImageUrl ? 'Trocar capa' : 'Enviar capa'}
            </button>
          </div>

          {/* Logo */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-cream-dim">Logo / monograma</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white/[0.02]">
                {event?.logoUrl ? <img src={event.logoUrl} alt="logo" className="h-full w-full object-cover" /> : <ImageIcon size={22} className="text-cream-dim" />}
              </div>
              <input ref={logoInput} type="file" accept="image/*" hidden
                onChange={(e) => handleUpload('logo', e.target.files?.[0])} />
              <button onClick={() => logoInput.current?.click()} disabled={uploading === 'logo'} className="btn-ghost btn-sm">
                {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                {event?.logoUrl ? 'Trocar logo' : 'Enviar logo'}
              </button>
            </div>
          </div>

          {/* Cor de destaque */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-cream-dim">Cor de destaque</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setThemeColor(c)}
                  className={`h-9 w-9 rounded-full border-2 transition ${themeColor?.toLowerCase() === c.toLowerCase() ? 'scale-110 border-white' : 'border-white/10'}`}
                  style={{ background: c }} title={c} />
              ))}
              <label className="flex h-9 items-center gap-2 rounded-full border border-line px-3 text-xs text-cream-dim">
                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                  className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" />
                {themeColor}
              </label>
            </div>
          </div>

          {/* Mensagem de boas-vindas */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-cream-dim">
              <MessageSquare size={14} /> Mensagem de boas-vindas
            </label>
            <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3} maxLength={280} placeholder="Ex.: Bem-vindos ao nosso casamento! Fotografem à vontade 💛"
              className="input-field resize-none" />
            <p className="mt-1 text-right text-xs text-cream-dim/60">{welcomeMessage.length}/280</p>
          </div>

          <button onClick={save} disabled={saving} className="btn-primary mt-6 w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar personalização'}
          </button>
        </section>
      </main>
    </div>
  );
}
