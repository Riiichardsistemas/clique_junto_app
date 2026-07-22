import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Copy, Download, Share2, Check, Monitor, ExternalLink } from 'lucide-react';

export default function QRCodeDisplay({ event }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error,   setError]   = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [copiedTelao, setCopiedTelao] = useState(false);
  const guestUrl = `${window.location.origin}/e/${event.slug}`;
  const telaoUrl = event.slideshowKey ? `${window.location.origin}/telao/${event.slideshowKey}` : null;

  // Busca o QR via axios (envia Authorization header) e converte em blob URL
  useEffect(() => {
    let objectUrl;
    api.get(`/events/${event.id}/qrcode`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [event.id]);

  function copyLink() {
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyTelaoLink() {
    navigator.clipboard.writeText(telaoUrl).then(() => {
      setCopiedTelao(true);
      toast.success('Link do telão copiado!');
      setTimeout(() => setCopiedTelao(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `✨ Você foi convidado para "${event.name}"!\nAcesse e tire suas fotos: ${guestUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function downloadQR() {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `qrcode-${event.slug}.png`;
    a.click();
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code */}
      <div className="rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_24px_60px_-20px_rgba(255,255,255,0.15)]">
        {blobUrl ? (
          <img src={blobUrl} alt="QR Code" className="h-48 w-48" />
        ) : error ? (
          <div className="flex h-48 w-48 items-center justify-center px-4 text-center text-xs text-gray-400">
            Erro ao carregar QR Code
          </div>
        ) : (
          <div className="flex h-48 w-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          </div>
        )}
      </div>

      {/* Link */}
      <button
        type="button"
        onClick={copyLink}
        className="group flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line bg-surface px-4 transition hover:border-gold/40"
        title="Copiar link"
      >
        <span className="truncate font-mono text-xs text-cream-dim group-hover:text-cream">
          {guestUrl.replace(/^https?:\/\//, '')}
        </span>
        {copied
          ? <Check size={13} className="shrink-0 text-emerald-400" />
          : <Copy size={13} className="shrink-0 text-cream-dim/70 group-hover:text-cream" />}
      </button>

      {/* Ações */}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={downloadQR} disabled={!blobUrl} className="btn-ghost px-4 py-2 text-sm disabled:opacity-40">
          <Download size={15} />
          Baixar QR
        </button>
        <button type="button" onClick={shareWhatsApp} className="btn-primary px-4 py-2 text-sm">
          <Share2 size={15} />
          WhatsApp
        </button>
      </div>

      {/* Telão ao vivo — link secreto para projetar as fotos (não depende da revelação) */}
      {telaoUrl && (
        <div className="w-full border-t border-line/60 pt-5">
          <p className="label-mono mb-1 flex items-center justify-center gap-1.5 text-gold/80">
            <Monitor size={12} /> Telão ao vivo
          </p>
          <p className="mb-3 text-center text-xs leading-relaxed text-cream-dim">
            Projete as fotos em tempo real no evento — funciona mesmo antes da revelação.
          </p>
          <button
            type="button"
            onClick={copyTelaoLink}
            className="group mx-auto flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line bg-surface px-4 transition hover:border-gold/40"
            title="Copiar link do telão"
          >
            <span className="truncate font-mono text-xs text-cream-dim group-hover:text-cream">
              {telaoUrl.replace(/^https?:\/\//, '')}
            </span>
            {copiedTelao
              ? <Check size={13} className="shrink-0 text-emerald-400" />
              : <Copy size={13} className="shrink-0 text-cream-dim/70 group-hover:text-cream" />}
          </button>
          <div className="mt-3 flex justify-center">
            <a href={telaoUrl} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2 text-sm">
              <ExternalLink size={15} />
              Abrir telão
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
