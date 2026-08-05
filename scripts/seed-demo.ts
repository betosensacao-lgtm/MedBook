import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { chatSessions, chatMessages } from "../src/db/schema";

config({ path: resolve(__dirname, "../.env.local") });

const CLINIC_ID = process.env.CLINIC_ID || "default";

const PATIENTS = [
  { name: "Ana Miller", phone: "+1 555 010 1001", email: "ana@email.com" },
  { name: "Carlos Santos", phone: "+1 555 010 1002", email: "carlos@email.com" },
  { name: "Marina Cole", phone: "+1 555 010 1003", email: "marina@email.com" },
  { name: "Pedro Alves", phone: "+1 555 010 1004", email: "pedro@email.com" },
  { name: "Julia Lima", phone: "+1 555 010 1005", email: "julia@email.com" },
  { name: "Robert Dias", phone: "+1 555 010 1006", email: "robert@email.com" },
  { name: "Fernanda Rocha", phone: "+1 555 010 1007", email: "fernanda@email.com" },
  { name: "Lucas Barbosa", phone: "+1 555 010 1008", email: "lucas@email.com" },
  { name: "Amanda Souza", phone: "+1 555 010 1009", email: "amanda@email.com" },
  { name: "Thiago Martins", phone: "+1 555 010 1010", email: "thiago@email.com" },
  { name: "Patricia Duarte", phone: "+1 555 010 1011", email: "patricia@email.com" },
  { name: "Rafael Campos", phone: "+1 555 010 1012", email: "rafael@email.com" },
  { name: "Larissa Farias", phone: "+1 555 010 1013", email: "larissa@email.com" },
  { name: "Diego Nunes", phone: "+1 555 010 1014", email: "diego@email.com" },
  { name: "Cristina Melo", phone: "+1 555 010 1015", email: "cristina@email.com" },
  { name: "Gustavo Rios", phone: "+1 555 010 1016", email: "gustavo@email.com" },
  { name: "Tatiana Neves", phone: "+1 555 010 1017", email: "tatiana@email.com" },
  { name: "Felipe Moreira", phone: "+1 555 010 1018", email: "felipe@email.com" },
  { name: "Daniela Castro", phone: "+1 555 010 1019", email: "daniela@email.com" },
  { name: "Eduardo Brito", phone: "+1 555 010 1020", email: "eduardo@email.com" },
];

type ConversationEntry = { role: "user" | "assistant"; content: string };

const CONVERSATIONS: ConversationEntry[][] = [
  [
    { role: "user", content: "Hi, I'd like to schedule an appointment" },
    { role: "assistant", content: "Hello! I'd be happy to help. Which specialty would you like to book?" },
    { role: "user", content: "General practice" },
    { role: "assistant", content: "We have availability this Thursday at 2pm or Friday at 9am. Which do you prefer?" },
    { role: "user", content: "Thursday at 2pm works great" },
    { role: "assistant", content: "Perfect! Your appointment is booked for Thursday at 2pm. We'll send a reminder the day before." },
  ],
  [
    { role: "user", content: "Good morning, what are your hours?" },
    { role: "assistant", content: "Good morning! We're open Monday to Friday, 7am to 7pm, and Saturdays 8am to noon." },
    { role: "user", content: "Do you accept insurance?" },
    { role: "assistant", content: "Yes! We work with Aetna, BlueCross, UnitedHealth, Cigna, and self-pay. What's your insurance?" },
    { role: "user", content: "UnitedHealth" },
    { role: "assistant", content: "Great! We accept UnitedHealth without any issues. Would you like to schedule an appointment?" },
  ],
  [
    { role: "user", content: "I need to reschedule my appointment" },
    { role: "assistant", content: "Of course! Please tell me your name and the current date of your appointment so I can look it up." },
    { role: "user", content: "Carlos Santos, scheduled for today at 4pm" },
    { role: "assistant", content: "Found your appointment! What day and time would you like to reschedule to?" },
    { role: "user", content: "Next Tuesday at 10am" },
    { role: "assistant", content: "Appointment rescheduled to Tuesday at 10am. I'll confirm the details by email." },
  ],
  [
    { role: "user", content: "How much does a self-pay visit cost?" },
    { role: "assistant", content: "General practice visit: $120. Specialist visit: $200. With basic tests included, it can run up to $250." },
    { role: "user", content: "Do I need an appointment for a blood test?" },
    { role: "assistant", content: "Yes, an appointment is required. We have slots for blood draws Monday to Friday, 7am to 10am. Would you like to book one?" },
  ],
  [
    { role: "user", content: "What days does Dr. Reynolds see patients?" },
    { role: "assistant", content: "Dr. Alan Reynolds sees patients Mondays, Wednesdays, and Fridays, 8am to noon and 2pm to 6pm." },
    { role: "user", content: "I'd like to book with him" },
    { role: "assistant", content: "We have availability next Monday at 9am or 11am. Which time works for you?" },
    { role: "user", content: "9am" },
    { role: "assistant", content: "Booked! Monday at 9am with Dr. Reynolds. We'll send a reminder via WhatsApp." },
  ],
  [
    { role: "user", content: "Do you have a neurologist?" },
    { role: "assistant", content: "Yes! Dr. Camila Ferreira is our neurologist. She sees patients Tuesdays and Thursdays." },
    { role: "user", content: "How long is the wait for an appointment?" },
    { role: "assistant", content: "About 15 days for a first visit. We have an opening two weeks out on Tuesday at 3pm. Interested?" },
  ],
  [
    { role: "user", content: "I need to cancel" },
    { role: "assistant", content: "Understood. Please give me your name and the appointment time you'd like to cancel." },
    { role: "user", content: "Lucas Barbosa, appointment with Dr. Reynolds tomorrow at 11am" },
    { role: "assistant", content: "Cancellation completed. Feel free to reschedule whenever you're ready. I'm here to help!" },
  ],
  [
    { role: "user", content: "What tests do you offer?" },
    { role: "assistant", content: "We offer blood, urine, and stool tests, imaging (ultrasound, X-ray), and EKG. Which test do you need?" },
  ],
  [
    { role: "user", content: "Does the clinic have parking?" },
    { role: "assistant", content: "Yes! We have free parking for patients with 30 spots. There's also easy access by public transit (bus line 457, stop right outside)." },
  ],
  [
    { role: "user", content: "Can I bring my 5-year-old?" },
    { role: "assistant", content: "Yes! We see children starting at age 2 with our pediatrician Dr. Beatriz Almeida. Would you like to book?" },
    { role: "user", content: "Yes, for Wednesday morning" },
    { role: "assistant", content: "We have Wednesday at 8:30am or 10:30am with Dr. Almeida. Which time works better?" },
    { role: "user", content: "8:30am" },
    { role: "assistant", content: "Booked! Wednesday at 8:30am with Dr. Almeida. Please bring the child's documents and insurance card." },
  ],
  [
    { role: "user", content: "Do you accept credit cards?" },
    { role: "assistant", content: "Yes! We accept cash, credit/debit cards (all major networks), and digital payment. Payment is due on the day of the visit." },
  ],
  [
    { role: "user", content: "What's your address?" },
    { role: "assistant", content: "We're located at 245 Palm Street, Midtown, and easy to reach from the downtown transit line." },
    { role: "user", content: "Coming by train, which exit should I take?" },
    { role: "assistant", content: "Take the Main Street exit. It's a 5-minute walk from the station. Turn left at the first corner." },
  ],
  [
    { role: "user", content: "Is there an extra fee for insurance visits?" },
    { role: "assistant", content: "No, we don't charge an extra fee for insurance visits. Just your regular copay, if applicable to your plan." },
  ],
  [
    { role: "user", content: "Do you offer online visits?" },
    { role: "assistant", content: "Yes! We offer telehealth Monday to Friday. Video visit with a general practitioner: $90 self-pay." },
    { role: "user", content: "I'd like to book an online visit" },
    { role: "assistant", content: "We have availability tomorrow at 2pm or 4pm. I'll send the video call link by email after you confirm." },
  ],
  [
    { role: "user", content: "How long do test results take?" },
    { role: "assistant", content: "Blood tests: 2 to 3 business days. Imaging: 24 to 48 hours. You'll get them by email or can pick them up at the front desk." },
    { role: "user", content: "Can you just email them to me?" },
    { role: "assistant", content: "Yes! As soon as they're ready, we send them automatically to the email on file. No worries." },
  ],
  [
    { role: "user", content: "I wanted information about the clinic's health plan" },
    { role: "assistant", content: "We partner with UnitedHealth for group plans. I can transfer you to our commercial advisor if you're interested." },
  ],
  [
    { role: "user", content: "I need a doctor's note" },
    { role: "assistant", content: "For a doctor's note, you'll need to come in for a visit. We have openings today at 3pm and 5pm with general practice. Would you like to book?" },
    { role: "user", content: "3pm" },
    { role: "assistant", content: "Booked! Today at 3pm. Remember to bring a photo ID." },
  ],
  [
    { role: "user", content: "Do you sell medication?" },
    { role: "assistant", content: "We don't sell medication. But there's a partner pharmacy two blocks away that offers a 10% discount for our patients with a prescription." },
  ],
  [
    { role: "user", content: "Is the clinic open on holidays?" },
    { role: "assistant", content: "No, we're closed on national and state holidays. The next holiday closure is September 7th. We reopen the following day as usual." },
  ],
  [
    { role: "user", content: "I had surgery and need follow-up care" },
    { role: "assistant", content: "We offer post-op follow-up with our surgeons. How long ago was your surgery? I can check whether a return visit is needed." },
    { role: "user", content: "15 days ago" },
    { role: "assistant", content: "We recommend a follow-up between 20 and 30 days out. I can book you for a week from now with your surgeon. I'll just need the doctor's name." },
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
