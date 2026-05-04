import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import pg from "pg";

const { Client } = pg;

if (!getApps().length) {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const firestoreDb = getFirestore();
const meetingsCol = firestoreDb.collection("meetings");
const COUNTER_DOC = firestoreDb.collection("_meta").doc("idCounter");

async function main() {
  const pgClient = new Client({ connectionString: process.env["DATABASE_URL"] });
  await pgClient.connect();

  const { rows } = await pgClient.query<{
    id: number;
    title: string;
    meeting_date: string;
    meeting_time: string;
    location: string | null;
    participants: string[];
    agenda: string;
    notes: string;
    tags: string[];
    status: string;
    created_at: Date;
    updated_at: Date;
  }>("SELECT * FROM meetings ORDER BY id ASC");

  await pgClient.end();

  if (rows.length === 0) {
    console.log("No rows found in PostgreSQL — seeding fresh sample data instead.");
    await seedSampleData();
    return;
  }

  console.log(`Migrating ${rows.length} meetings from PostgreSQL to Firestore...`);

  const batch = firestoreDb.batch();
  let maxId = 0;

  for (const row of rows) {
    const docRef = meetingsCol.doc(String(row.id));
    batch.set(docRef, {
      title: row.title,
      meetingDate: row.meeting_date,
      meetingTime: row.meeting_time,
      location: row.location ?? null,
      participants: row.participants ?? [],
      agenda: row.agenda ?? "",
      notes: row.notes ?? "",
      tags: row.tags ?? [],
      status: row.status ?? "scheduled",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    if (row.id > maxId) maxId = row.id;
  }

  batch.set(COUNTER_DOC, { value: maxId });
  await batch.commit();

  console.log(`Done! Migrated ${rows.length} meetings. Counter set to ${maxId}.`);
}

async function seedSampleData() {
  const today = new Date();
  const d = (offsetDays: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  };

  const samples = [
    {
      id: 1,
      title: "Marketing & Product Sync",
      meetingDate: d(17),
      meetingTime: "13:00",
      location: "Atrium Room 2",
      participants: ["Maya Chen", "Daniel Park", "Renee Okafor"],
      agenda: "Review Q2 campaign results and align on product launch timeline.",
      notes: "",
      tags: ["marketing", "product", "launch"],
      status: "scheduled",
    },
    {
      id: 2,
      title: "Hiring Sync: Senior Frontend",
      meetingDate: d(12),
      meetingTime: "11:00",
      location: "Zoom",
      participants: ["Maya Chen", "Hannah Brooks", "Daniel Park"],
      agenda: "Review candidates for senior frontend role.",
      notes: "",
      tags: ["hiring", "engineering"],
      status: "scheduled",
    },
    {
      id: 3,
      title: "Customer Discovery: Northwind",
      meetingDate: d(9),
      meetingTime: "14:00",
      location: "Customer office (downtown)",
      participants: ["Maya Chen", "Sofia Romano", "Renee Okafor (Northwind)"],
      agenda: "Understand pain points and gather feedback on prototype.",
      notes: "",
      tags: ["customer", "discovery", "sales"],
      status: "scheduled",
    },
    {
      id: 4,
      title: "Q3 Product Roadmap Review",
      meetingDate: d(5),
      meetingTime: "10:00",
      location: "Atrium Room 4",
      participants: ["Maya Chen", "Idris Patel", "Sofia Romano", "Liu Wei"],
      agenda: "Prioritize Q3 features and finalize delivery dates.",
      notes: "Team agreed on shipping analytics v2 by end of July.",
      tags: ["product", "roadmap", "planning"],
      status: "completed",
    },
    {
      id: 5,
      title: "Engineering Standup",
      meetingDate: d(1),
      meetingTime: "09:30",
      location: "Zoom",
      participants: ["Idris Patel", "Liu Wei", "Hannah Brooks", "Sofia Romano"],
      agenda: "Daily blockers and progress update.",
      notes: "",
      tags: ["engineering", "standup"],
      status: "scheduled",
    },
    {
      id: 6,
      title: "Board Prep Session",
      meetingDate: d(-2),
      meetingTime: "15:00",
      location: "Conference Room A",
      participants: ["Maya Chen", "Daniel Park"],
      agenda: "Prepare slides and talking points for board meeting.",
      notes: "Slides sent for review. Follow-up with CFO needed.",
      tags: ["board", "finance", "executive"],
      status: "completed",
    },
    {
      id: 7,
      title: "Design Review: Mobile App",
      meetingDate: d(-5),
      meetingTime: "11:00",
      location: "Zoom",
      participants: ["Sofia Romano", "Hannah Brooks", "Maya Chen"],
      agenda: "Review mobile app designs and gather feedback.",
      notes: "New color scheme approved. Accessibility pass scheduled.",
      tags: ["design", "mobile", "product"],
      status: "completed",
    },
  ];

  const batch = firestoreDb.batch();
  for (const s of samples) {
    const docRef = meetingsCol.doc(String(s.id));
    const now = new Date();
    batch.set(docRef, {
      title: s.title,
      meetingDate: s.meetingDate,
      meetingTime: s.meetingTime,
      location: s.location,
      participants: s.participants,
      agenda: s.agenda,
      notes: s.notes,
      tags: s.tags,
      status: s.status,
      createdAt: now,
      updatedAt: now,
    });
  }
  batch.set(COUNTER_DOC, { value: samples.length });
  await batch.commit();
  console.log(`Seeded ${samples.length} sample meetings into Firestore.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
