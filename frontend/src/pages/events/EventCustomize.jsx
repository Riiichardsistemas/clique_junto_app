import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft, Monitor, Copy, ExternalLink, Image as ImageIcon, Palette,
  MessageSquare, UploadCloud, Loader2, Radio,
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

  const coverInput = useRef(null);
  const logoInput = useRef(null);

  useEffect(() => {
    eventApi.getOne(id)
      .then((d) => {
        setEvent(d.event);
        setThemeColor(d.event.themeColor || '#C4A96C');
        setWelcomeMessage(d.event.welcomeMessage || '');
        setLiveWall(!!d.event.liveWallEnabled);
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
      toast.success(slot === 'cover' ? 'Capa atualizada!' : 'Logo atualizado!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao enviar imagem.');
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const d = await eventApi.update(id, { themeColor, welcomeMessage, liveWallEnabled: liveWall });
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

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <h1 className="text-3xl">Personalizar “{event?.name}”</h1>

        {/* ---------- TELÃO ---------- */}
        <section className="card p-6">
          <div className="card-section-header"><Monitor /><span className="card-section-title">Telão da festa</span></div>

          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-line bg-white/[0.02] p-4">
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
          <div className="flex gap-2">
            <input readOnly value={telaoUrl} className="input-field flex-1 text-xs" onFocus={(e) => e.target.select()} />
            <button onClick={copyLink} className="btn-ghost btn-sm shrink-0" title="Copiar"><Copy size={14} /></button>
            <a href={telaoUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm shrink-0" title="Abrir telão">
              <ExternalLink size={14} /> Abrir
            </a>
          </div>
          <p className="mt-2 text-xs text-cream-dim">Abra este link em qualquer TV ou notebook no local. Não precisa fazer login. Roda sozinho como apresentação.</p>
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
