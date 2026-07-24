import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { chatSessions, chatMessages } from "../src/db/schema";

config({ path: resolve(__dirname, "../.env.local") });

const CLINIC_ID = process.env.CLINIC_ID || "default";

const PATIENTS = [
  { name: "Ana Oliveira", phone: "(11) 99999-1001", email: "ana@email.com" },
  { name: "Carlos Santos", phone: "(11) 99999-1002", email: "carlos@email.com" },
  { name: "Marina Costa", phone: "(11) 99999-1003", email: "marina@email.com" },
  { name: "Pedro Alves", phone: "(11) 99999-1004", email: "pedro@email.com" },
  { name: "Juliana Lima", phone: "(11) 99999-1005", email: "juliana@email.com" },
  { name: "Roberto Dias", phone: "(11) 99999-1006", email: "roberto@email.com" },
  { name: "Fernanda Rocha", phone: "(11) 99999-1007", email: "fernanda@email.com" },
  { name: "Lucas Barbosa", phone: "(11) 99999-1008", email: "lucas@email.com" },
  { name: "Amanda Souza", phone: "(11) 99999-1009", email: "amanda@email.com" },
  { name: "Thiago Martins", phone: "(11) 99999-1010", email: "thiago@email.com" },
  { name: "Patrícia Duarte", phone: "(11) 99999-1011", email: "patricia@email.com" },
  { name: "Rafael Campos", phone: "(11) 99999-1012", email: "rafael@email.com" },
  { name: "Larissa Farias", phone: "(11) 99999-1013", email: "larissa@email.com" },
  { name: "Diego Nunes", phone: "(11) 99999-1014", email: "diego@email.com" },
  { name: "Cristina Melo", phone: "(11) 99999-1015", email: "cristina@email.com" },
  { name: "Gustavo Rios", phone: "(11) 99999-1016", email: "gustavo@email.com" },
  { name: "Tatiana Neves", phone: "(11) 99999-1017", email: "tatiana@email.com" },
  { name: "Felipe Moreira", phone: "(11) 99999-1018", email: "felipe@email.com" },
  { name: "Daniela Castro", phone: "(11) 99999-1019", email: "daniela@email.com" },
  { name: "Eduardo Brito", phone: "(11) 99999-1020", email: "eduardo@email.com" },
];

type ConversationEntry = { role: "user" | "assistant"; content: string };

const CONVERSATIONS: ConversationEntry[][] = [
  [
    { role: "user", content: "Olá, gostaria de agendar uma consulta" },
    { role: "assistant", content: "Olá! Ficarei feliz em ajudar. Para qual especialidade você deseja agendar?" },
    { role: "user", content: "Clínico geral" },
    { role: "assistant", content: "Temos disponibilidade nesta quinta às 14h ou sexta às 9h. Qual prefere?" },
    { role: "user", content: "Quinta às 14h está ótimo" },
    { role: "assistant", content: "Perfeito! Sua consulta foi agendada para quinta-feira às 14h. Enviaremos um lembrete um dia antes." },
  ],
  [
    { role: "user", content: "Bom dia, qual o horário de funcionamento?" },
    { role: "assistant", content: "Bom dia! Funcionamos de segunda a sexta, das 7h às 19h, e sábados das 8h às 12h." },
    { role: "user", content: "Vocês atendem convênios?" },
    { role: "assistant", content: "Sim! Trabalhamos com Amil, Bradesco Saúde, Unimed, SulAmérica e particular. Qual é o seu convênio?" },
    { role: "user", content: "Unimed" },
    { role: "assistant", content: "Ótimo! Aceitamos Unimed sem problemas. Gostaria de agendar uma consulta?" },
  ],
  [
    { role: "user", content: "Preciso remarcar meu horário" },
    { role: "assistant", content: "Claro! Me informe seu nome e o dia atual do agendamento que verifico para você." },
    { role: "user", content: "Carlos Santos, agendado para hoje às 16h" },
    { role: "assistant", content: "Encontrei seu agendamento! Para qual dia e horário gostaria de remarcar?" },
    { role: "user", content: "Terça que vem às 10h" },
    { role: "assistant", content: "Agendamento remarcado para terça-feira às 10h. Confirmo por e-mail os detalhes." },
  ],
  [
    { role: "user", content: "Quanto custa uma consulta particular?" },
    { role: "assistant", content: "Consulta com clínico geral: R$ 200,00. Com especialista: R$ 350,00. Com exames simples inclusos, o valor pode chegar a R$ 400,00." },
    { role: "user", content: "E para exame de sangue, precisa de agendamento?" },
    { role: "assistant", content: "Sim, é necessário agendar. Temos vagas para coleta de segunda a sexta, das 7h às 10h. Gostaria de marcar?" },
  ],
  [
    { role: "user", content: "O Dr. Ricardo atende que dias?" },
    { role: "assistant", content: "O Dr. Ricardo Mendes atende segundas, quartas e sextas, das 8h às 12h e das 14h às 18h." },
    { role: "user", content: "Quero marcar com ele" },
    { role: "assistant", content: "Temos disponibilidade na próxima segunda às 9h ou 11h. Qual horário prefere?" },
    { role: "user", content: "9h" },
    { role: "assistant", content: "Agendado! Segunda-feira às 9h com Dr. Ricardo. Enviaremos lembrete por WhatsApp." },
  ],
  [
    { role: "user", content: "Vocês têm neurologista?" },
    { role: "assistant", content: "Sim! A Dra. Camila Ferreira é nossa neurologista. Ela atende terças e quintas." },
    { role: "user", content: "Quanto tempo de espera para agenda?" },
    { role: "assistant", content: "Aproximadamente 15 dias para primeira consulta. Temos vaga para daqui duas semanas na terça às 15h. Interessa?" },
  ],
  [
    { role: "user", content: "Preciso cancelar" },
    { role: "assistant", content: "Compreendo. Me informe seu nome e o horário que deseja cancelar para processarmos." },
    { role: "user", content: "Lucas Barbosa, consulta com Dr. Ricardo amanhã às 11h" },
    { role: "assistant", content: "Cancelamento realizado com sucesso. Se precisar remarque quando quiser. Estou à disposição!" },
  ],
  [
    { role: "user", content: "Quais exames vocês oferecem?" },
    { role: "assistant", content: "Oferecemos exames de sangue, urina, fezes, imagem (ultrassom, raio-x) e eletrocardiograma. Qual exame você precisa?" },
  ],
  [
    { role: "user", content: "A clínica tem estacionamento?" },
    { role: "assistant", content: "Sim! Temos estacionamento gratuito para pacientes com 30 vagas. Também há fácil acesso por transporte público (linha 457, parada em frente)." },
  ],
  [
    { role: "user", content: "Quero saber se posso levar meu filho de 5 anos" },
    { role: "assistant", content: "Sim! Atendemos crianças a partir de 2 anos com nossa pediatra Dra. Beatriz Almeida. Gostaria de agendar?" },
    { role: "user", content: "Sim, para quarta de manhã" },
    { role: "assistant", content: "Temos quarta às 8h30 ou 10h30 com a Dra. Beatriz. Qual horário prefere?" },
    { role: "user", content: "8h30" },
    { role: "assistant", content: "Agendado! Quarta-feira às 8h30 com Dra. Beatriz. Traga documentos da criança e cartão do convênio." },
  ],
  [
    { role: "user", content: "Aceita cartão de crédito?" },
    { role: "assistant", content: "Sim! Aceitamos dinheiro, cartão de crédito/débito (todas as bandeiras) e PIX. O pagamento é feito no dia da consulta." },
  ],
  [
    { role: "user", content: "Qual o endereço?" },
    { role: "assistant", content: "Estamos na Rua das Palmeiras, 245, Jardim América, São Paulo - SP. Próximo ao metrô Consolação." },
    { role: "user", content: "Chegando de metrô, qual saída pegar?" },
    { role: "assistant", content: "Saída pela Rua Augusta. São 5 minutos a pé da estação. Vire à esquerda na primeira esquina." },
  ],
  [
    { role: "user", content: "A consulta pelo convênio tem taxa extra?" },
    { role: "assistant", content: "Não, não cobramos taxa extra para consultas com convênio. Apenas o valor regular da coparticipação, se aplicável ao seu plano." },
  ],
  [
    { role: "user", content: "Vocês fazem atendimento online?" },
    { role: "assistant", content: "Sim! Oferecemos telemedicina de segunda a sexta. Consulta por vídeo chamada com clínico geral: R$ 150,00 particular." },
    { role: "user", content: "Quero marcar online" },
    { role: "assistant", content: "Disponibilidade para amanhã às 14h ou 16h. Vou enviar o link da videochamada por e-mail após a confirmação." },
  ],
  [
    { role: "user", content: "Os resultados de exames saem em quanto tempo?" },
    { role: "assistant", content: "Exames de sangue: 2 a 3 dias úteis. Imagem: 24h a 48h. Você recebe por e-mail ou pode retirar na recepção." },
    { role: "user", content: "Pode enviar por e-mail mesmo?" },
    { role: "assistant", content: "Sim! Assim que ficarem prontos, enviamos automaticamente para o e-mail cadastrado. Fique tranquilo." },
  ],
  [
    { role: "user", content: "Queria informações sobre o plano de saúde da clínica" },
    { role: "assistant", content: "Temos parceria com a Unimed ABC para planos empresariais. Posso transferir para nosso consultor comercial se tiver interesse." },
  ],
  [
    { role: "user", content: "Preciso de atestado médico" },
    { role: "assistant", content: "Para atestado, é necessário passar por consulta. Temos vagas hoje às 15h e 17h com clínico geral. Deseja agendar?" },
    { role: "user", content: "15h" },
    { role: "assistant", content: "Agendado! Hoje às 15h. Lembre-se de trazer documento com foto." },
  ],
  [
    { role: "user", content: "Vocês vendem medicamentos?" },
    { role: "assistant", content: "Não vendemos medicamentos. Mas temos uma farmácia parceira a 2 quarteirões que oferece 10% de desconto para pacientes da clínica mediante receita." },
  ],
  [
    { role: "user", content: "A clínica está aberta no feriado?" },
    { role: "assistant", content: "Não, fechamos em feriados nacionais e estaduais. O próximo feriado útil será no dia 7 de setembro. Retornamos no dia seguinte normalmente." },
  ],
  [
    { role: "user", content: "Fiz uma cirurgia e preciso de acompanhamento" },
    { role: "assistant", content: "Temos acompanhamento pós-operatório com nossos cirurgiões. Em quanto tempo foi sua cirurgia? Posso verificar a necessidade de retorno." },
    { role: "user", content: "15 dias atrás" },
    { role: "assistant", content: "Recomendamos retorno entre 20 e 30 dias. Posso agendar para daqui uma semana com seu cirurgião. Vou precisar do nome do médico." },
  ],
];

async function main() {
  const client = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  console.log("Seeding demo data...");

  // Clear existing demo data
  await db.delete(chatMessages);
  await db.delete(chatSessions);
  console.log("  Cleared existing chat data.");

  const now = new Date();

  for (let i = 0; i < CONVERSATIONS.length; i++) {
    const patient = PATIENTS[i];
    const messages = CONVERSATIONS[i];

    // Spread sessions across last 13 days with today having most activity
    const daysAgo = i < 5 ? i : Math.min(13, 4 + Math.floor(i / 2));
    const hour = 8 + Math.floor(Math.random() * 10);
    const minute = Math.floor(Math.random() * 60);

    const sessionTime = new Date(now);
    sessionTime.setDate(sessionTime.getDate() - daysAgo);
    sessionTime.setHours(hour, minute, 0, 0);

    const [session] = await db
      .insert(chatSessions)
      .values({
        sessionId: `demo-${String(i + 1).padStart(3, "0")}`,
        clinicId: CLINIC_ID,
        patientName: patient.name,
        patientPhone: patient.phone,
        patientEmail: patient.email,
        createdAt: sessionTime,
        updatedAt: sessionTime,
      } as any)
      .returning({ id: chatSessions.id, sessionId: chatSessions.sessionId });

    console.log(`  Creating session: ${patient.name} (${daysAgo}d ago)`);

    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const msgTime = new Date(sessionTime);
      msgTime.setMinutes(msgTime.getMinutes() + 1 + j * 3 + Math.floor(Math.random() * 2));

      await db.insert(chatMessages).values({
        sessionId: session.sessionId,
        role: msg.role,
        content: msg.content,
        createdAt: msgTime,
      } as any);
    }
  }

  console.log(`\nDone! ${CONVERSATIONS.length} demo sessions created.`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
