import { Link } from 'react-router-dom';
import { ChevronLeft, Mail } from 'lucide-react';
import LogoMark from '../components/ui/LogoMark.jsx';

/*
 * Política de Privacidade — conforme a LGPD (Lei nº 13.709/2018).
 * Página pública, acessível pela tela de login (rota /privacidade).
 *
 * Contato do controlador / encarregado: cliquejunto@outlook.com
 */

const CONTACT_EMAIL = 'cliquejunto@outlook.com';
const LAST_UPDATE = '22 de julho de 2026';

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-cream sm:text-[28px]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-cream/70">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="app-screen bg-ink-deep text-cream">
      {/* Fundo suave */}
      <div className="pointer-events-none fixed left-1/2 top-[-16rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-gold/[0.05] blur-3xl" />

      {/* Topbar */}
      <header className="app-topbar sticky top-0 z-20 glass">
        <div className="mx-auto flex min-h-[56px] max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-cream-dim transition hover:text-cream"
          >
            <ChevronLeft size={15} />
            Voltar
          </Link>
          <span className="inline-flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="font-serif text-[15px] font-bold tracking-tight text-cream">Clique Junto</span>
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-6 sm:pt-12">
        {/* Cabeçalho */}
        <p className="label-mono mb-3 text-gold">Documento legal</p>
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-tight sm:text-[52px]">
          Política de Privacidade
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-cream/60">
          Esta Política descreve como o <strong className="text-cream/85">Clique Junto</strong> coleta, usa,
          armazena e protege os dados pessoais dos seus usuários e convidados, em conformidade com a
          Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD) e demais normas aplicáveis.
        </p>
        <p className="mt-2 text-[13px] text-cream/40">Última atualização: {LAST_UPDATE}</p>

        <div className="my-8 h-px w-full bg-white/10" />

        <div className="space-y-10">
          <Section id="quem-somos" title="1. Quem somos">
            <p>
              O <strong className="text-cream/85">Clique Junto</strong> (“nós”, “nosso” ou “plataforma”) é um
              serviço digital de câmera descartável para eventos, disponível em{' '}
              <span className="text-cream/85">cliquejunto.com.br</span>, que permite que organizadores criem
              eventos e que convidados registrem e compartilhem fotos e vídeos, revelados em um álbum coletivo.
            </p>
            <p>
              Para fins da LGPD, atuamos como <strong className="text-cream/85">controlador</strong> dos dados
              pessoais tratados na plataforma. Dúvidas sobre esta Política ou sobre o tratamento dos seus dados
              podem ser enviadas para o e-mail indicado na seção <em>Contato e Encarregado</em>.
            </p>
          </Section>

          <Section id="definicoes" title="2. Definições">
            <p>
              <strong className="text-cream/85">Dado pessoal:</strong> informação relacionada a pessoa natural
              identificada ou identificável. <strong className="text-cream/85">Titular:</strong> a pessoa a quem
              os dados se referem. <strong className="text-cream/85">Tratamento:</strong> qualquer operação
              realizada com dados pessoais (coleta, uso, armazenamento, compartilhamento, eliminação, entre
              outras). <strong className="text-cream/85">Controlador:</strong> quem toma as decisões sobre o
              tratamento. <strong className="text-cream/85">Operador:</strong> quem trata dados em nome do
              controlador.
            </p>
          </Section>

          <Section id="dados-coletados" title="3. Dados que coletamos">
            <p>Coletamos apenas os dados necessários para operar a plataforma e prestar o serviço:</p>
            <ul className="ml-4 list-disc space-y-2 marker:text-gold/60">
              <li>
                <strong className="text-cream/85">Dados de cadastro (organizador):</strong> nome, e-mail e senha
                (armazenada de forma criptografada).
              </li>
              <li>
                <strong className="text-cream/85">Dados de participação (convidado):</strong> apelido/nome de
                exibição escolhido e as fotos e vídeos enviados ao evento.
              </li>
              <li>
                <strong className="text-cream/85">Conteúdo de mídia:</strong> as fotos e vídeos capturados podem
                conter imagens de pessoas. Esse conteúdo é enviado voluntariamente pelos participantes.
              </li>
              <li>
                <strong className="text-cream/85">Dados de pagamento:</strong> ao contratar planos pagos,
                coletamos CPF ou CNPJ e as informações necessárias para processar o pagamento via Pix. Os dados
                financeiros são processados diretamente pelo nosso provedor de pagamentos.
              </li>
              <li>
                <strong className="text-cream/85">Dados técnicos e de uso:</strong> endereço IP, tipo de
                dispositivo, navegador, data e hora de acesso e registros de atividade (logs), coletados para
                segurança e funcionamento do serviço.
              </li>
            </ul>
            <p>
              Não coletamos intencionalmente dados pessoais sensíveis. Caso opte por incluir esse tipo de
              informação em fotos, vídeos ou textos, você o faz por sua conta e responsabilidade.
            </p>
          </Section>

          <Section id="finalidades" title="4. Como e por que usamos seus dados">
            <p>Tratamos dados pessoais para as seguintes finalidades e bases legais previstas na LGPD:</p>
            <ul className="ml-4 list-disc space-y-2 marker:text-gold/60">
              <li>
                <strong className="text-cream/85">Criar e gerenciar sua conta e eventos</strong> — execução de
                contrato (art. 7º, V).
              </li>
              <li>
                <strong className="text-cream/85">Armazenar e revelar as fotos e vídeos do álbum</strong> —
                execução de contrato e legítimo interesse (art. 7º, V e IX).
              </li>
              <li>
                <strong className="text-cream/85">Processar pagamentos e emitir cobranças</strong> — execução de
                contrato e cumprimento de obrigação legal/fiscal (art. 7º, V e II).
              </li>
              <li>
                <strong className="text-cream/85">Enviar comunicações transacionais</strong> (confirmações,
                recuperação de senha, avisos sobre o evento) — execução de contrato.
              </li>
              <li>
                <strong className="text-cream/85">Garantir segurança, prevenir fraudes e abusos</strong> —
                legítimo interesse e cumprimento de obrigação legal (art. 7º, IX e II).
              </li>
              <li>
                <strong className="text-cream/85">Melhorar a plataforma</strong> — legítimo interesse (art. 7º, IX).
              </li>
            </ul>
          </Section>

          <Section id="compartilhamento" title="5. Compartilhamento de dados">
            <p>
              Não vendemos seus dados pessoais. Compartilhamos dados apenas com prestadores de serviço
              (operadores) estritamente necessários para o funcionamento da plataforma, sempre limitados às
              finalidades desta Política:
            </p>
            <ul className="ml-4 list-disc space-y-2 marker:text-gold/60">
              <li>
                <strong className="text-cream/85">Processamento de pagamentos</strong> (ex.: Asaas), para
                gerar cobranças Pix e confirmar transações;
              </li>
              <li>
                <strong className="text-cream/85">Envio de e-mails</strong> (ex.: Resend), para comunicações
                transacionais;
              </li>
              <li>
                <strong className="text-cream/85">Armazenamento em nuvem</strong> (ex.: Amazon Web Services /
                Cloudflare), para guardar as fotos e vídeos com segurança;
              </li>
              <li>
                <strong className="text-cream/85">Autoridades públicas</strong>, quando exigido por lei, ordem
                judicial ou requisição de autoridade competente.
              </li>
            </ul>
            <p>
              Os participantes de um evento têm acesso ao álbum coletivo daquele evento. Ao enviar uma foto ou
              vídeo, você entende que ele poderá ser visto e baixado pelos demais participantes e pelo
              organizador do evento.
            </p>
          </Section>

          <Section id="cookies" title="6. Cookies e tecnologias de armazenamento">
            <p>
              Utilizamos cookies e tecnologias semelhantes (como armazenamento local do navegador) estritamente
              necessários para autenticação, manutenção da sessão e funcionamento do serviço. Você pode
              gerenciar cookies nas configurações do seu navegador, mas alguns recursos podem deixar de
              funcionar corretamente sem eles.
            </p>
          </Section>

          <Section id="retencao" title="7. Armazenamento e retenção">
            <p>
              Mantemos os dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas ou
              para atender obrigações legais e regulatórias. As fotos e vídeos de um evento permanecem
              disponíveis enquanto a conta e o evento estiverem ativos. Após o encerramento da conta ou mediante
              solicitação de exclusão, os dados serão eliminados ou anonimizados, ressalvadas as hipóteses de
              guarda obrigatória previstas em lei.
            </p>
          </Section>

          <Section id="seguranca" title="8. Segurança da informação">
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra
              acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração ou
              divulgação — incluindo criptografia de senhas, controle de acesso e conexões seguras (HTTPS).
              Nenhum sistema é totalmente inviolável; por isso, mantenha sua senha em sigilo e nos avise em caso
              de suspeita de uso indevido da sua conta.
            </p>
          </Section>

          <Section id="direitos" title="9. Seus direitos como titular">
            <p>Nos termos do art. 18 da LGPD, você pode, a qualquer momento, solicitar:</p>
            <ul className="ml-4 list-disc space-y-2 marker:text-gold/60">
              <li>confirmação da existência de tratamento e acesso aos seus dados;</li>
              <li>correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
              <li>portabilidade dos dados a outro fornecedor, mediante requisição;</li>
              <li>eliminação dos dados tratados com base no consentimento;</li>
              <li>informação sobre com quem compartilhamos seus dados;</li>
              <li>revogação do consentimento, quando aplicável.</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato pelo e-mail indicado abaixo. Poderemos solicitar
              informações adicionais para confirmar sua identidade antes de atender ao pedido.
            </p>
          </Section>

          <Section id="imagens" title="10. Fotos e imagem de terceiros">
            <p>
              Ao capturar e enviar fotos ou vídeos que contenham a imagem de outras pessoas, você declara ter
              obtido o consentimento necessário dessas pessoas para o registro e o compartilhamento no álbum do
              evento. Se você aparece em uma imagem e deseja removê-la, entre em contato com o organizador do
              evento ou conosco pelo e-mail de contato.
            </p>
          </Section>

          <Section id="menores" title="11. Crianças e adolescentes">
            <p>
              A plataforma não é destinada à criação de contas por menores de 18 anos. O tratamento de dados de
              crianças e adolescentes, quando ocorrer no contexto de imagens de eventos, deve observar o melhor
              interesse do menor e contar com o consentimento específico de ao menos um dos pais ou responsável
              legal, conforme o art. 14 da LGPD.
            </p>
          </Section>

          <Section id="transferencia" title="12. Transferência internacional de dados">
            <p>
              Alguns de nossos prestadores de serviço podem armazenar ou processar dados em servidores
              localizados fora do Brasil. Nesses casos, adotamos salvaguardas para assegurar que a transferência
              ocorra em conformidade com a LGPD e com nível adequado de proteção.
            </p>
          </Section>

          <Section id="alteracoes" title="13. Alterações desta Política">
            <p>
              Podemos atualizar esta Política periodicamente para refletir mudanças na plataforma ou na
              legislação. A data da última atualização estará sempre indicada no topo deste documento.
              Recomendamos a revisão periódica. Alterações relevantes poderão ser comunicadas por e-mail ou
              dentro da plataforma.
            </p>
          </Section>

          <Section id="contato" title="14. Contato e Encarregado (DPO)">
            <p>
              Para exercer seus direitos, tirar dúvidas ou fazer solicitações relacionadas aos seus dados
              pessoais, entre em contato com o nosso Encarregado pelo Tratamento de Dados Pessoais:
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-2 inline-flex items-center gap-2.5 rounded-2xl border border-gold/25 bg-gold/[0.06] px-5 py-3 text-[15px] font-medium text-cream transition hover:border-gold/40 hover:bg-gold/[0.1]"
            >
              <Mail size={17} className="text-gold" />
              {CONTACT_EMAIL}
            </a>
          </Section>
        </div>

        <div className="my-10 h-px w-full bg-white/10" />

        <p className="flex items-center gap-2 text-[13px] text-cream/35">
          <LogoMark className="h-4 w-4 opacity-70" />
          © {new Date().getFullYear()} Clique Junto — Todos os direitos reservados.
        </p>

        <p className="mt-6 text-center text-sm text-cream/60">
          <Link to="/login" className="font-medium text-gold underline-offset-4 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </main>
    </div>
  );
}
