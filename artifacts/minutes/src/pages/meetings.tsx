import { Layout } from "@/components/layout";
import { useListMeetings, getListMeetingsQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MeetingCard } from "@/components/meeting-card";
import { Search, List, Grid, SlidersHorizontal, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useSearch } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export default function MeetingsList() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialTag = searchParams.get("tag") || "";

  const [search, setSearch] = useState("");
  const [tag, setTag] = useState(initialTag);
  const [view, setView] = useState<"grid" | "table">("grid");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Only pass params when they have values — prevents empty-object key mismatch
  const queryParams =
    debouncedSearch || tag
      ? { search: debouncedSearch || undefined, tag: tag || undefined }
      : undefined;

  const { data: meetings, isLoading } = useListMeetings(queryParams, {
    query: {
      queryKey: getListMeetingsQueryKey(queryParams),
    },
  });

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground mt-1">
              Browse, search, and filter your meeting records.
            </p>
          </div>
          <Button onClick={() => navigate("/meetings/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
        </header>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search titles, agendas, or participants..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by tag..."
                className="pl-9"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>
            <div className="flex items-center border rounded-md bg-background">
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-none rounded-l-md h-9 w-10 ${view === "grid" ? "bg-muted" : ""}`}
                onClick={() => setView("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-none rounded-r-md h-9 w-10 ${view === "table" ? "bg-muted" : ""}`}
                onClick={() => setView("table")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div
            className={
              view === "grid"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "space-y-4"
            }
          >
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : meetings?.length === 0 ? (
          <div className="py-20 text-center border border-dashed rounded-xl bg-card/50">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No meetings found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting your search or filters to find what you're looking
              for.
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetings?.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings?.map((meeting) => (
                  <TableRow
                    key={meeting.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <TableCell className="font-medium">
                      {meeting.title}
                      <div className="text-xs text-muted-foreground mt-1 font-normal line-clamp-1">
                        {meeting.participants.join(", ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap">
                        {format(parseISO(meeting.meetingDate), "MMM d, yyyy")}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {meeting.meetingTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          meeting.status === "completed"
                            ? "default"
                            : meeting.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {meeting.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {meeting.tags.slice(0, 2).map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[10px] uppercase"
                          >
                            {t}
                          </Badge>
                        ))}
                        {meeting.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{meeting.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
