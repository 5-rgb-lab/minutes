import { Router, type IRouter } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db, meetingsCol } from "../lib/firebase";
import { requireAuth } from "../lib/auth";
import {
  ListMeetingsQueryParams,
  ListMeetingsResponse,
  CreateMeetingBody,
  GetMeetingParams,
  GetMeetingResponse,
  UpdateMeetingParams,
  UpdateMeetingBody,
  UpdateMeetingResponse,
  DeleteMeetingParams,
  GetMeetingsSummaryResponse,
  GetRecentMeetingsResponse,
  GetTagBreakdownResponse,
  GetUpcomingMeetingsResponse,
} from "@workspace/api-zod";
import type { DocumentSnapshot } from "firebase-admin/firestore";

const router: IRouter = Router();
router.use(requireAuth);

const COUNTER_DOC = db.collection("_meta").doc("idCounter");

async function nextId(): Promise<number> {
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(COUNTER_DOC);
    const current: number = snap.exists ? (snap.data()!["value"] as number) : 0;
    const next = current + 1;
    tx.set(COUNTER_DOC, { value: next });
    return next;
  });
  return result;
}

function docToMeeting(snap: DocumentSnapshot) {
  const d = snap.data()!;
  return {
    id: parseInt(snap.id, 10),
    title: d["title"] as string,
    meetingDate: d["meetingDate"] as string,
    meetingTime: d["meetingTime"] as string,
    location: (d["location"] as string | null) ?? null,
    participants: (d["participants"] as string[]) ?? [],
    agenda: (d["agenda"] as string) ?? "",
    notes: (d["notes"] as string) ?? "",
    tags: (d["tags"] as string[]) ?? [],
    status: (d["status"] as string) ?? "scheduled",
    createdAt:
      d["createdAt"] && typeof d["createdAt"].toDate === "function"
        ? d["createdAt"].toDate()
        : new Date(d["createdAt"] as string),
    updatedAt:
      d["updatedAt"] && typeof d["updatedAt"].toDate === "function"
        ? d["updatedAt"].toDate()
        : new Date(d["updatedAt"] as string),
  };
}

router.get("/meetings", async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const parsed = ListMeetingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, tag } = parsed.data;
  const snap = await meetingsCol.where("createdBy", "==", userId).get();
  let meetings = snap.docs.map(docToMeeting);

  if (search && search.trim().length > 0) {
    const term = search.trim().toLowerCase();
    meetings = meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.participants.some((p) => p.toLowerCase().includes(term)) ||
        m.agenda.toLowerCase().includes(term),
    );
  }

  if (tag && tag.trim().length > 0) {
    meetings = meetings.filter((m) => m.tags.includes(tag.trim()));
  }

  meetings.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));

  res.json(ListMeetingsResponse.parse(meetings));
});

router.post("/meetings", async (req, res): Promise<void> => {
  const parsed = CreateMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = await nextId();
  const now = new Date();
  const data = {
    title: parsed.data.title,
    meetingDate: parsed.data.meetingDate,
    meetingTime: parsed.data.meetingTime,
    location: parsed.data.location ?? null,
    participants: parsed.data.participants ?? [],
    agenda: parsed.data.agenda ?? "",
    notes: parsed.data.notes ?? "",
    tags: parsed.data.tags ?? [],
    status: parsed.data.status ?? "scheduled",
    createdBy: req.user?.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await meetingsCol.doc(String(id)).set(data);

  const created = {
    ...data,
    id,
    location: data.location ?? null,
    createdAt: now,
    updatedAt: now,
  };

  res.status(201).json(GetMeetingResponse.parse(created));
});

router.get("/meetings/stats/summary", async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const snap = await meetingsCol.where("createdBy", "==", userId).get();
  const all = snap.docs.map(docToMeeting);
  const today = new Date().toISOString().slice(0, 10);

  const summary = {
    total: all.length,
    scheduled: all.filter((m) => m.status === "scheduled").length,
    completed: all.filter((m) => m.status === "completed").length,
    cancelled: all.filter((m) => m.status === "cancelled").length,
    upcomingCount: all.filter((m) => m.meetingDate >= today).length,
    uniqueParticipants: new Set(all.flatMap((m) => m.participants)).size,
  };

  res.json(GetMeetingsSummaryResponse.parse(summary));
});

router.get("/meetings/stats/recent", async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const snap = await meetingsCol.where("createdBy", "==", userId).get();
  const rows = snap.docs.map(docToMeeting);
  rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  res.json(GetRecentMeetingsResponse.parse(rows.slice(0, 5)));
});

router.get("/meetings/stats/tags", async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const snap = await meetingsCol.where("createdBy", "==", userId).get();
  const all = snap.docs.map(docToMeeting);
  const counts = new Map<string, number>();
  for (const m of all) {
    for (const t of m.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const result = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  res.json(GetTagBreakdownResponse.parse(result));
});

router.get("/meetings/stats/upcoming", async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const today = new Date().toISOString().slice(0, 10);
  const snap = await meetingsCol.where("createdBy", "==", userId).get();
  const rows = snap.docs
    .map(docToMeeting)
    .filter((m) => m.meetingDate >= today)
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));

  res.json(GetUpcomingMeetingsResponse.parse(rows));
});

router.get("/meetings/:id", async (req, res): Promise<void> => {
  const params = GetMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const snap = await meetingsCol.doc(String(params.data.id)).get();
  if (!snap.exists) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  const data = snap.data();
  if (!data || data["createdBy"] !== req.user?.id) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  res.json(GetMeetingResponse.parse(docToMeeting(snap)));
});

router.patch("/meetings/:id", async (req, res): Promise<void> => {
  const params = UpdateMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const docRef = meetingsCol.doc(String(params.data.id));
  const existing = await docRef.get();
  if (!existing.exists) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  const existingData = existing.data();
  if (!existingData || existingData["createdBy"] !== req.user?.id) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const body = parsed.data;
  if (body.title !== undefined) updates["title"] = body.title;
  if (body.meetingDate !== undefined) updates["meetingDate"] = body.meetingDate;
  if (body.meetingTime !== undefined) updates["meetingTime"] = body.meetingTime;
  if ("location" in body) updates["location"] = body.location ?? null;
  if (body.participants !== undefined) updates["participants"] = body.participants;
  if (body.agenda !== undefined) updates["agenda"] = body.agenda;
  if (body.notes !== undefined) updates["notes"] = body.notes;
  if (body.tags !== undefined) updates["tags"] = body.tags;
  if (body.status !== undefined) updates["status"] = body.status;
  updates["updatedAt"] = FieldValue.serverTimestamp();

  await docRef.update(updates);

  const updated = await docRef.get();
  res.json(UpdateMeetingResponse.parse(docToMeeting(updated)));
});

router.delete("/meetings/:id", async (req, res): Promise<void> => {
  const params = DeleteMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const docRef = meetingsCol.doc(String(params.data.id));
  const existing = await docRef.get();
  if (!existing.exists) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  const existingData = existing.data();
  if (!existingData || existingData["createdBy"] !== req.user?.id) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  await docRef.delete();
  res.sendStatus(204);
});

export default router;
