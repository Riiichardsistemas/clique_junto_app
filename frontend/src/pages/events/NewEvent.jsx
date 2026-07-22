import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, Heart, PartyPopper, Cake, Briefcase, Plane, Camera as CameraIcon, Aperture,
  Palette, MessageSquare, UploadCloud, X, MapPin,
} from 'lucide-react';
import { eventApi } from '../../api/eventApi';
import PlanSelector from '../../components/PlanSelector';
import FilterSelector from '../../components/FilterSelector';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LogoMark from '../../components/ui/LogoMark.jsx';
import { PLANS, formatBRL } from '../../utils/plans';

const EVENT_TYPES = [
  { id: 'casamento', label: 'Casamento', Icon: Heart },
  { id: 'festa', label: 'Festa', Icon: PartyPopper },
  { id: 'aniversario', label: 'Aniversário', Icon: Cake },
  { id: 'corporativo', label: 'Corporativo', Icon: Briefcase },
  { id: 'viagem', label: 'Viagem', Icon: Plane },
  { id: 'outro', label: 'Outro', Icon: CameraIcon },
];

const PHOTO_LIMITS = [
  { value: 5, label: '5 fotos' },
  { value: 10, label: '10 fotos' },
  { value: 15, label: '15 fotos' },
  { value: 20, label: '20 fotos' },
  { value: 30, label: '30 fotos' },
  { value: 0, label: 'Ilimitado' },
];

const PRESET_COLORS = ['#C4A96C', '#E8B4B8', '#7EA4A0', '#8E7CC3', '#D98C5F', '#5B7DB1', '#B5654A', '#3F4A3C'];

const STEPS = ['Informações', 'Configurações', 'Personalização', 'Plano', 'Confirmar'];

const defaultForm = {
  name: '',
  type: 'casamento',
  startsAt: '',
  endsAt: '',
  revealAt: '',
  photoLimitPerGuest: 10,
  defaultFilter: 'nenhum',
  planId: 'free',
  themeColor: '#C4A96C',
  welcomeMessage: '',
  entryTemplate: 'classic',
  venueName: '',
};

const stepAnim = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export default function NewEvent() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [coverFile, setCoverFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [inviteFiles, setInviteFiles] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const coverInput = useRef(null);
  const logoInput = useRef(null);
  const inviteInput0 = useRef(null);
  const inviteInput1 = useRef(null);
  const inviteInput2 = useRef(null);
  const inviteInputs = [inviteInput0, inviteInput1, inviteInput2];

  const setInviteFile = (i, file) =>
    setInviteFiles((fs) => fs.map((f, j) => (j === i ? file : f)));

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Previews locais das imagens escolhidas
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  const invitePreviews = useMemo(
    () => inviteFiles.map((f) => (f ? URL.createObjectURL(f) : null)),
    [inviteFiles]
  );
  useEffect(() => () => { invitePreviews.forEach((u) => u && URL.revokeObjectURL(u)); }, [invitePreviews]);

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        revealAt: form.revealAt || form.endsAt || null,
        welcomeMessage: form.welcomeMessage.trim() || null,
        venueName: form.venueName.trim() || null,
      };
      const data = await eventApi.create(payload);
      const eventId = data.event.id;

      // Envia imagens escolhidas no fluxo (não bloqueia a criação se falhar)
      const uploads = [];
      if (form.entryTemplate === 'convite') {
        inviteFiles.forEach((f, i) => {
          if (f) uploads.push(eventApi.uploadBrandingImage(eventId, `invite${i + 1}`, f));
        });
      } else {
        if (coverFile) uploads.push(eventApi.uploadBrandingImage(eventId, 'cover', coverFile));
        if (logoFile) uploads.push(eventApi.uploadBrandingImage(eventId, 'logo', logoFile));
      }
      if (uploads.length) {
        const results = await Promise.allSettled(uploads);
        if (results.some((r) => r.status === 'rejected')) {
          toast('Evento criado, mas uma imagem não subiu. Você pode reenviar em Personalizar.', { icon: '⚠️' });
        }
      }

      if (data.requiresPayment) {
        // Plano pago: leva ao checkout no app (Pix ou cartão)
        toast('Evento criado! Escolha como pagar.', { icon: '💳' });
        navigate(`/events/${eventId}/checkout`);
        return;
      }
      toast.success('Evento criado e ativado!');
      navigate(`/events/${eventId}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao criar evento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-screen flex flex-col text-cream">
      <header className="app-topbar glass sticky top-0 z-20">
        <div className="mx-auto flex min-h-[60px] max-w-2xl items-center gap-3 px-3 py-1.5 sm:px-6">
          {/* Voltar: recua etapa; no passo 0, sai para os eventos */}
          <button
            type="button"
            onClick={() => (step === 0 ? navigate('/dashboard') : setStep((s) => s - 1))}
            aria-label="Voltar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-cream-dim transition hover:text-cream"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-cream">Novo evento</p>
            <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wider text-cream/40">
              Etapa {step + 1} de {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          {/* Pular: só nas etapas opcionais (datas e personalização) */}
          {(step === 1 || step === 2) ? (
            <button type="button" onClick={() => setStep((s) => s + 1)}
              className="shrink-0 px-2 text-sm font-medium text-gold underline-offset-4 transition hover:underline">
              Pular
            </button>
          ) : (
            <span className="w-8 shrink-0" />
          )}
        </div>
      </header>

      {/* Coluna flex sem padding-bottom no mobile: o conteúdo (flex-1) empurra a
          barra sticky de navegação para o rodapé mesmo em passos curtos */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-5 sm:px-6 sm:py-10">
        {/* Progresso — barra segmentada logo abaixo do cabeçalho (mockup) */}
        <div className="mb-7 sm:mb-10">
          <div className="flex items-center gap-2" role="progressbar" aria-label="Progresso da criação do evento" aria-valuemin="1" aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-2">
                <div className={`h-1 rounded-full transition-all duration-300 ${
                  i < step ? 'bg-gold/60' : i === step ? 'bg-gold' : 'bg-white/10'}`} />
                <span className={`hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors sm:flex ${
                  i <= step ? 'text-cream/85' : 'text-cream-dim/50'}`}>
                  {i < step && <Check size={10} strokeWidth={3} className="text-emerald-400" />}
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
        <AnimatePresence mode="wait">
          {/* Passo 1 — Informações */}
          {step === 0 && (
            <motion.div key="s0" {...stepAnim} className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Qual é o nome do evento?</h1>
                <p className="mt-2 text-sm text-cream-dim">Esse nome aparecerá para os seus convidados.</p>
              </div>
              <Input aria-label="Nome do evento" placeholder="Ex: Casamento da Ana & Pedro" value={form.name}
                onChange={(e) => set('name', e.target.value)} autoFocus />
              <div>
                <p className="mb-3 text-sm font-medium text-cream-dim">Tipo do evento</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {EVENT_TYPES.map(({ id, label, Icon }) => (
                    <button key={id} type="button" aria-pressed={form.type === id} onClick={() => set('type', id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-1 py-4 text-xs font-medium transition-all duration-200 sm:gap-2.5 sm:py-5 sm:text-sm ${
                        form.type === id
                          ? 'border-gold/60 bg-gold/10 text-gold'
                          : 'border-line text-cream-dim hover:border-gold/40 hover:bg-gold/[0.04] hover:text-cream'}`}>
                      <Icon size={20} strokeWidth={1.6} className={form.type === id ? 'text-gold' : 'text-cream-dim'} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Passo 2 — Configurações */}
          {step === 1 && (
            <motion.div key="s1" {...stepAnim} className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Configurações do evento</h1>
                <p className="mt-2 text-sm text-cream-dim">Defina as datas e limites do álbum.</p>
              </div>

              {/* Card DATAS */}
              <div className="card space-y-5 p-4 sm:p-5">
                <p className="label-mono !text-[10px] text-cream/35">Datas</p>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-cream">Início do evento</label>
                    <input aria-label="Início do evento" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="input-field" />
                    <p className="mt-1.5 text-xs text-cream-dim/70">Quando os convidados podem começar a enviar fotos.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-baseline justify-between">
                      <label className="text-sm font-semibold text-cream">Encerramento</label>
                      <span className="text-xs text-cream/35">Opcional</span>
                    </div>
                    <input aria-label="Encerramento do evento" type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="input-field" />
                    <p className="mt-1.5 text-xs text-cream-dim/70">Depois disso o álbum para de aceitar fotos.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-baseline justify-between">
                      <label className="text-sm font-semibold text-cream">Revelação</label>
                      <span className="text-xs text-cream/35">Opcional</span>
                    </div>
                    <input aria-label="Revelação do álbum" type="datetime-local" value={form.revealAt} onChange={(e) => set('revealAt', e.target.value)} className="input-field" />
                    <p className="mt-1.5 text-xs text-cream-dim/70">Deixe vazio para o álbum ficar visível desde o início.</p>
                  </div>
                </div>
              </div>

              {/* Card FOTOS POR CONVIDADO — com o valor selecionado no topo (mockup) */}
              <div className="card p-4 sm:p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="label-mono !text-[10px] text-cream/35">Fotos por convidado</p>
                  <span className="text-[13px] font-semibold text-gold">
                    {form.photoLimitPerGuest === 0 ? 'Ilimitado' : `${form.photoLimitPerGuest} fotos`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_LIMITS.map((l) => (
                    <button key={l.value} type="button" aria-pressed={form.photoLimitPerGuest === l.value} onClick={() => set('photoLimitPerGuest', l.value)}
                      className={`min-h-11 rounded-full border text-sm font-medium transition-all ${
                        form.photoLimitPerGuest === l.value
                          ? 'border-gold/70 bg-gold text-[#1c160c]'
                          : 'border-line text-cream-dim hover:border-gold/40 hover:text-cream'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card FILTRO PADRÃO */}
              <div className="card p-4 sm:p-5">
                <p className="label-mono mb-3 !text-[10px] text-cream/35">Filtro fotográfico padrão</p>
                <FilterSelector value={form.defaultFilter} onChange={(v) => set('defaultFilter', v)} />
              </div>
            </motion.div>
          )}

          {/* Passo 3 — Personalização */}
          {step === 2 && (
            <motion.div key="s2" {...stepAnim} className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Deixe com a sua cara</h1>
                <p className="mt-2 text-sm text-cream-dim">
                  Opcional — tudo aqui pode ser ajustado depois em <span className="text-cream">Personalizar</span>, na página do evento.
                </p>
              </div>

              {/* Modelo da página de entrada */}
              <div>
                <p className="mb-2 text-sm font-medium text-cream-dim">Modelo da página de entrada</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" aria-pressed={form.entryTemplate === 'classic'} onClick={() => set('entryTemplate', 'classic')}
                    className={`overflow-hidden rounded-xl border-2 text-left transition ${form.entryTemplate === 'classic' ? 'border-gold' : 'border-line hover:border-gold/40'}`}>
                    <div className="flex h-24 flex-col items-center justify-center gap-1.5 bg-[#14110b] sm:h-28">
                      <span className="h-1.5 w-12 rounded-full bg-white/20" />
                      <span className="h-2.5 w-20 rounded-full bg-white/40" />
                      <span className="mt-1 h-5 w-24 rounded-lg border border-white/10 bg-white/[0.06]" />
                      <span className="h-4 w-24 rounded-lg" style={{ background: form.themeColor }} />
                    </div>
                    <p className="px-3 py-2 text-xs font-medium text-cream">Clássico <span className="font-normal text-cream-dim">— escuro</span></p>
                  </button>
                  <button type="button" aria-pressed={form.entryTemplate === 'convite'} onClick={() => set('entryTemplate', 'convite')}
                    className={`overflow-hidden rounded-xl border-2 text-left transition ${form.entryTemplate === 'convite' ? 'border-gold' : 'border-line hover:border-gold/40'}`}>
                    <div className="relative flex h-24 flex-col items-center justify-center gap-1.5 bg-[#f2ead9] sm:h-28">
                      <span className="absolute left-1/2 top-2 h-9 w-8 -translate-x-[62%] -rotate-6 rounded-sm bg-white shadow-md" />
                      <span className="absolute left-1/2 top-3 h-9 w-8 -translate-x-[30%] rotate-3 rounded-sm bg-white shadow-md" />
                      <span className="absolute left-1/2 top-9 -translate-x-[10%] rotate-6 rounded-sm px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-wider text-white" style={{ background: form.themeColor }}>convite ★</span>
                      <span className="mt-10 h-2 w-16 rounded-full bg-[#2b241a]/70" />
                      <span className="h-4 w-24 rounded-lg bg-[#2b241a]" />
                    </div>
                    <p className="px-3 py-2 text-xs font-medium text-cream">Convite <span className="font-normal text-cream-dim">— polaroids</span></p>
                  </button>
                </div>
              </div>

              {/* Preview ao vivo da página do convidado */}
              <div>
                <p className="label-mono mb-2 text-cream-dim/70">Prévia da página do convidado</p>
                {form.entryTemplate === 'convite' ? (
                  <div className="overflow-hidden rounded-2xl border border-line bg-[#f2ead9] px-4 pb-6 pt-4 text-center text-[#2b241a]">
                    <p className="flex items-center justify-center gap-1.5 font-serif text-xs italic text-[#2b241a]/70">
                      <LogoMark variant="light" className="h-3.5 w-3.5 shrink-0" />
                      Clique Junto
                    </p>
                    <div className="relative mx-auto mt-2 h-28 w-36">
                      {invitePreviews[1] && (
                        <span className="absolute left-1/2 top-1 h-24 w-20 -translate-x-[80%] -rotate-6 overflow-hidden rounded-sm bg-white p-1 shadow-md">
                          <img src={invitePreviews[1]} alt="" className="h-full w-full object-cover" />
                        </span>
                      )}
                      <span className="absolute left-1/2 top-0 h-[6.5rem] w-24 -translate-x-[35%] rotate-3 overflow-hidden rounded-sm bg-white p-1 shadow-lg">
                        {invitePreviews[0]
                          ? <img src={invitePreviews[0]} alt="" className="h-full w-full object-cover" />
                          : <span className="flex h-full w-full items-center justify-center bg-[#e5dcc8]"><CameraIcon size={16} className="text-[#2b241a]/30" /></span>}
                      </span>
                      <span className="absolute bottom-0 left-1/2 translate-x-[15%] rotate-6 rounded-sm px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white shadow" style={{ background: form.themeColor }}>
                        convite ★
                      </span>
                    </div>
                    <p className="mt-2.5 font-mono text-[8px] font-semibold uppercase tracking-[0.2em]" style={{ color: form.themeColor }}>Você foi convidado para</p>
                    <p className="font-serif text-xl font-semibold leading-tight">{form.name || 'Nome do evento'}</p>
                    <p className="mt-0.5 text-[11px] text-[#2b241a]/60">
                      {[
                        form.startsAt ? new Date(form.startsAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : null,
                        form.venueName.trim() || null,
                      ].filter(Boolean).join(' · ') || 'data · local'}
                    </p>
                    <span className="mt-3 inline-block rounded-lg bg-[#2b241a] px-6 py-2 text-xs font-semibold text-[#f2ead9]">Entrar no filme →</span>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-line bg-white/[0.02]">
                    <div className="relative h-36 w-full sm:h-44">
                      {coverPreview ? (
                        <img src={coverPreview} alt="capa" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${form.themeColor}33, ${form.themeColor}0d)` }} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#12100b] via-transparent to-transparent" />
                      <div className="absolute -bottom-8 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-2 bg-[#1c160c]" style={{ borderColor: form.themeColor }}>
                        {logoPreview
                          ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" />
                          : <Aperture size={22} style={{ color: form.themeColor }} />}
                      </div>
                    </div>
                    <div className="px-6 pb-6 pt-11 text-center">
                      <p className="font-serif text-xl font-semibold tracking-tight">{form.name || 'Nome do evento'}</p>
                      <p className="mx-auto mt-1.5 max-w-sm text-xs text-cream-dim">
                        {form.welcomeMessage.trim() || 'Sua mensagem de boas-vindas aparecerá aqui.'}
                      </p>
                      <span className="mt-4 inline-block rounded-full px-5 py-2 text-xs font-semibold text-[#1c160c]" style={{ background: form.themeColor }}>
                        Entrar no álbum
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cor de destaque */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-cream-dim">
                  <Palette size={14} /> Cor de destaque
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" aria-label={`Usar cor ${c}`} aria-pressed={form.themeColor === c} onClick={() => set('themeColor', c)}
                      className={`h-11 w-11 rounded-full border-2 transition ${form.themeColor.toLowerCase() === c.toLowerCase() ? 'scale-105 border-white' : 'border-white/10'}`}
                      style={{ background: c }} title={c} />
                  ))}
                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-xs text-cream-dim">
                    <input type="color" value={form.themeColor} onChange={(e) => set('themeColor', e.target.value)}
                      className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" />
                    {form.themeColor}
                  </label>
                </div>
              </div>

              {/* Mensagem de boas-vindas */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-cream-dim">
                  <MessageSquare size={14} /> Mensagem de boas-vindas
                </label>
                <textarea aria-label="Mensagem de boas-vindas" value={form.welcomeMessage} onChange={(e) => set('welcomeMessage', e.target.value)}
                  rows={3} maxLength={280} placeholder="Ex.: Bem-vindos ao nosso casamento! Fotografem à vontade 💛"
                  className="input-field resize-none" />
                <p className="mt-1 text-right text-xs text-cream-dim/60">{form.welcomeMessage.length}/280</p>
              </div>

              {form.entryTemplate === 'convite' ? (
                <>
                  {/* Local do evento */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-cream-dim">
                      <MapPin size={14} /> Local do evento
                    </label>
                    <input aria-label="Local do evento" className="input-field" value={form.venueName} maxLength={60}
                      onChange={(e) => set('venueName', e.target.value)} placeholder="Ex.: Quinta do Vale" />
                    <p className="mt-1.5 text-xs text-cream-dim/70">Aparece junto da data no convite.</p>
                  </div>

                  {/* Fotos do convite */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <ImagePicker
                          label={i === 0 ? 'Foto principal' : `Foto ${i + 1}`}
                          hint={i === 0 ? 'Polaroid em destaque' : 'Polaroid de fundo'}
                          file={inviteFiles[i]}
                          onPick={() => inviteInputs[i].current?.click()}
                          onClear={() => setInviteFile(i, null)}
                        />
                        <input ref={inviteInputs[i]} type="file" accept="image/*" hidden
                          onChange={(e) => { setInviteFile(i, e.target.files?.[0] || null); e.target.value = ''; }} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ImagePicker
                    label="Imagem de capa"
                    hint="Fundo da página de entrada"
                    file={coverFile}
                    onPick={() => coverInput.current?.click()}
                    onClear={() => setCoverFile(null)}
                  />
                  <ImagePicker
                    label="Logo / monograma"
                    hint="Aparece em destaque no topo"
                    file={logoFile}
                    onPick={() => logoInput.current?.click()}
                    onClear={() => setLogoFile(null)}
                  />
                  <input ref={coverInput} type="file" accept="image/*" hidden
                    onChange={(e) => { setCoverFile(e.target.files?.[0] || null); e.target.value = ''; }} />
                  <input ref={logoInput} type="file" accept="image/*" hidden
                    onChange={(e) => { setLogoFile(e.target.files?.[0] || null); e.target.value = ''; }} />
                </div>
              )}
            </motion.div>
          )}

          {/* Passo 4 — Plano */}
          {step === 3 && (
            <motion.div key="s3" {...stepAnim} className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Escolha o plano</h1>
                <p className="mt-2 text-sm text-cream-dim">Quantos convidados você espera?</p>
              </div>
              <PlanSelector value={form.planId} onChange={(v) => set('planId', v)} />
            </motion.div>
          )}

          {/* Passo 5 — Confirmar */}
          {step === 4 && (
            <motion.div key="s4" {...stepAnim} className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Confirmar e criar</h1>
                <p className="mt-2 text-sm text-cream-dim">Revise as informações antes de continuar.</p>
              </div>
              <div className="card divide-y divide-line/60 p-6 text-sm [&>div]:py-3 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
                <Row label="Nome" value={form.name} />
                <Row label="Tipo" value={EVENT_TYPES.find((t) => t.id === form.type)?.label} />
                <Row label="Início" value={form.startsAt ? new Date(form.startsAt).toLocaleString('pt-BR') : '—'} />
                <Row label="Encerramento" value={form.endsAt ? new Date(form.endsAt).toLocaleString('pt-BR') : '—'} />
                <Row label="Revelação" value={form.revealAt ? new Date(form.revealAt).toLocaleString('pt-BR') : 'Imediata — álbum aberto'} />
                <Row label="Fotos/convidado" value={form.photoLimitPerGuest === 0 ? 'Ilimitado' : form.photoLimitPerGuest} />
                <Row label="Filtro" value={form.defaultFilter} />
                <Row label="Modelo da página" value={form.entryTemplate === 'convite' ? 'Convite (polaroids)' : 'Clássico'} />
                {form.entryTemplate === 'convite' && (
                  <Row label="Local" value={form.venueName.trim() || '—'} />
                )}
                <Row label="Cor de destaque" value={
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: form.themeColor }} />
                    {form.themeColor}
                  </span>
                } />
                <Row label="Boas-vindas" value={form.welcomeMessage.trim()
                  ? `“${form.welcomeMessage.trim().slice(0, 40)}${form.welcomeMessage.trim().length > 40 ? '…' : ''}”`
                  : '—'} />
                <Row label={form.entryTemplate === 'convite' ? 'Fotos do convite' : 'Capa / Logo'}
                  value={form.entryTemplate === 'convite'
                    ? (inviteFiles.filter(Boolean).length ? `${inviteFiles.filter(Boolean).length} foto(s)` : '—')
                    : ([coverFile && 'Capa', logoFile && 'Logo'].filter(Boolean).join(' + ') || '—')} />
                <Row label="Plano" value={(() => {
                  const plan = PLANS.find((p) => p.id === form.planId);
                  return plan ? `${plan.label} — ${formatBRL(plan.priceCents)}` : form.planId;
                })()} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Navegação — Voltar (contorno) · Continuar (pill claro), como no mockup */}
        <div className="mobile-action-bar mt-10 flex items-center gap-3">
          <Button variant="ghost" className="!rounded-full !px-6" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ChevronLeft size={16} />
            Voltar
          </Button>
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <Button className="!min-w-[52%] !rounded-full !px-6" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !form.name.trim()}>
              Continuar
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button className="!min-w-[52%] !rounded-full !px-6" onClick={submit} loading={loading} disabled={loading}>
              {loading ? 'Criando...' : 'Criar evento'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function ImagePicker({ label, hint, file, onPick, onClear }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-4">
      <p className="text-sm font-medium text-cream">{label}</p>
      <p className="mt-0.5 text-xs text-cream-dim">{hint}</p>
      {file ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-emerald-400">
            <Check size={13} strokeWidth={3} />
            <span className="truncate text-cream-dim">{file.name}</span>
          </span>
          <button type="button" onClick={onClear} className="icon-button" title="Remover" aria-label="Remover imagem">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={onPick} className="btn-ghost btn-sm mt-3">
          <UploadCloud size={14} /> Escolher imagem
        </button>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-cream-dim">{label}</span>
      <span className="text-right font-medium text-cream">{value}</span>
    </div>
  );
}
