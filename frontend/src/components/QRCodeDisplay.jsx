import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function QRCodeDisplay({ event }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error,   setError]   = useState(false);
  const guestUrl = `${window.location.origin}/e/${event.slug}`;

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
    navigator.clipboard.writeText(guestUrl).then(() => toast.success('Link copiado!'));
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
    <div className="flex flex-col items-center gap-5">
      {/* QR Code */}
      <div className="rounded-2xl bg-white p-4 shadow-lg">
        {blobUrl ? (
          <img src={blobUrl} alt="QR Code" className="h-48 w-48" />
        ) : error ? (
          <div className="flex h-48 w-48 items-center justify-center text-center text-xs text-gray-400 px-4">
            Erro ao carregar QR Code
          </div>
        ) : (
          <div className="flex h-48 w-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          </div>
        )}
      </div>

      {/* Link */}
      <p className="max-w-xs break-all text-center text-xs text-cream/40">{guestUrl}</p>

      {/* Ações */}
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={copyLink} className="btn-ghost px-4 py-2 text-sm">
          Copiar link
        </button>
        <button onClick={downloadQR} disabled={!blobUrl} className="btn-ghost px-4 py-2 text-sm disabled:opacity-40">
          Baixar QR
        </button>
        <button onClick={shareWhatsApp} className="btn-primary px-4 py-2 text-sm">
          WhatsApp
        </button>
      </div>
    </div>
  );
}
