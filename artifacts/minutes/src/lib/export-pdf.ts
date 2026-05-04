import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";

interface MeetingForPdf {
  title: string;
  meetingDate: string;
  meetingTime: string;
  location?: string | null;
  participants: string[];
  agenda: string;
  notes: string;
  tags: string[];
  status: string;
}

const PAGE_MARGIN = 56;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 32;

export function exportMeetingAsPdf(meeting: MeetingForPdf): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = PAGE_MARGIN;
  let pageNumber = 1;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
      drawFooter();
      doc.addPage();
      pageNumber += 1;
      y = PAGE_MARGIN;
    }
  };

  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(meeting.title, PAGE_MARGIN, FOOTER_Y);
    doc.text(`Page ${pageNumber}`, PAGE_WIDTH - PAGE_MARGIN, FOOTER_Y, {
      align: "right",
    });
    doc.setTextColor(0);
  };

  const writeWrapped = (
    text: string,
    options: {
      font?: "normal" | "bold";
      size?: number;
      color?: number;
      lineHeight?: number;
      gapAfter?: number;
    } = {},
  ) => {
    const {
      font = "normal",
      size = 11,
      color = 30,
      lineHeight = 1.45,
      gapAfter = 0,
    } = options;
    doc.setFont("helvetica", font);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text || " ", CONTENT_WIDTH) as string[];
    const lh = size * lineHeight;
    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, PAGE_MARGIN, y);
      y += lh;
    }
    y += gapAfter;
  };

  const writeSectionHeader = (label: string) => {
    ensureSpace(36);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(label.toUpperCase(), PAGE_MARGIN, y, { charSpace: 1.2 });
    y += 6;
    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
    y += 14;
    doc.setTextColor(0);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("MEETING MINUTES", PAGE_MARGIN, y, { charSpace: 1.5 });
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15);
  const titleLines = doc.splitTextToSize(meeting.title, CONTENT_WIDTH) as string[];
  for (const line of titleLines) {
    ensureSpace(28);
    doc.text(line, PAGE_MARGIN, y);
    y += 26;
  }
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  let dateStr = meeting.meetingDate;
  try {
    dateStr = format(parseISO(meeting.meetingDate), "EEEE, MMMM d, yyyy");
  } catch {
    // keep raw string
  }
  const metaLine = [
    dateStr,
    meeting.meetingTime,
    meeting.location ?? null,
    meeting.status ? `Status: ${meeting.status}` : null,
  ]
    .filter(Boolean)
    .join("   •   ");
  writeWrapped(metaLine, { size: 10, color: 90, gapAfter: 6 });

  if (meeting.tags.length > 0) {
    writeWrapped(`Tags: ${meeting.tags.join(", ")}`, {
      size: 10,
      color: 110,
      gapAfter: 8,
    });
  }

  doc.setDrawColor(210);
  doc.setLineWidth(0.75);
  ensureSpace(20);
  doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
  y += 18;

  writeSectionHeader("Participants");
  if (meeting.participants.length > 0) {
    for (const p of meeting.participants) {
      writeWrapped(`•  ${p}`, { size: 11 });
    }
  } else {
    writeWrapped("No participants recorded.", { size: 11, color: 130 });
  }

  writeSectionHeader("Agenda");
  writeWrapped(meeting.agenda || "No agenda recorded.", {
    size: 11,
    color: meeting.agenda ? 30 : 130,
  });

  writeSectionHeader("Notes");
  writeWrapped(meeting.notes || "No notes recorded for this meeting.", {
    size: 11,
    color: meeting.notes ? 30 : 130,
  });

  drawFooter();

  const safeTitle = meeting.title
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "meeting";
  const fileName = `${safeTitle}-${meeting.meetingDate}.pdf`;
  doc.save(fileName);
}
