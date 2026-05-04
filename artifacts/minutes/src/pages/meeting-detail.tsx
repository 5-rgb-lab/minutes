import { Layout } from "@/components/layout";
import {
  useGetMeeting,
  useDeleteMeeting,
  getGetMeetingQueryKey,
  getListMeetingsQueryKey,
  getGetMeetingsSummaryQueryKey,
  getGetRecentMeetingsQueryKey,
  getGetTagBreakdownQueryKey,
  getGetUpcomingMeetingsQueryKey,
} from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, Users, Edit, Trash2, ArrowLeft, Download } from "lucide-react";
import { exportMeetingAsPdf } from "@/lib/export-pdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function MeetingDetail() {
  const [, params] = useRoute("/meetings/:id");
  const id = Number(params?.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: meeting,
    isLoading,
    isError,
  } = useGetMeeting(id, {
    query: {
      enabled: !!id && !isNaN(id),
      queryKey: getGetMeetingQueryKey(id),
    },
  });

  const deleteMutation = useDeleteMeeting({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Meeting deleted",
          description: "The meeting has been successfully removed.",
        });
        queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeetingsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentMeetingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTagBreakdownQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUpcomingMeetingsQueryKey() });
        navigate("/meetings");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete meeting. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  if (isError) {
    return (
      <Layout>
        <div className="p-6 max-w-3xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold">Meeting not found</h2>
          <p className="text-muted-foreground mt-2">
            This meeting may have been deleted or doesn't exist.
          </p>
          <Button className="mt-6" onClick={() => navigate("/meetings")}>
            Return to Meetings
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading || !meeting) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-pulse">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
        {/* Top nav */}
        <nav className="flex items-center justify-between">
          <button
            onClick={() => navigate("/meetings")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to meetings
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMeetingAsPdf(meeting)}
            >
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/meetings/${id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the meeting record and all its notes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate({ id })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete Meeting"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </nav>

        {/* Header */}
        <header className="space-y-6 pb-6 border-b">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={
                  meeting.status === "completed"
                    ? "default"
                    : meeting.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                }
                className="capitalize px-3 py-1"
              >
                {meeting.status}
              </Badge>
              {meeting.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="uppercase text-xs tracking-wider"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {meeting.title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-y-4 gap-x-8 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary/70" />
              <span className="text-foreground">
                {format(parseISO(meeting.meetingDate), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary/70" />
              <span className="text-foreground">{meeting.meetingTime}</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary/70" />
                <span className="text-foreground">{meeting.location}</span>
              </div>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Agenda
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground bg-card border rounded-xl p-6 shadow-sm">
                {meeting.agenda.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {paragraph || "\u00A0"}
                  </p>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Notes
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                {meeting.notes ? (
                  meeting.notes.split("\n").map((paragraph, i) => (
                    <p key={i} className="mb-4 last:mb-0">
                      {paragraph || "\u00A0"}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">
                    No notes recorded for this meeting.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Participants sidebar */}
          <div>
            <section className="bg-card border rounded-xl p-6 shadow-sm sticky top-10">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary/70" />
                Participants ({meeting.participants.length})
              </h3>
              <ul className="space-y-3">
                {meeting.participants.map((participant) => (
                  <li key={participant} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm shrink-0">
                      {participant.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{participant}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
