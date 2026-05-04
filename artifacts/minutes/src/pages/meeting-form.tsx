import { Layout } from "@/components/layout";
import {
  useCreateMeeting,
  useUpdateMeeting,
  useGetMeeting,
  getGetMeetingQueryKey,
  getListMeetingsQueryKey,
  getGetMeetingsSummaryQueryKey,
  getGetRecentMeetingsQueryKey,
  getGetTagBreakdownQueryKey,
  getGetUpcomingMeetingsQueryKey,
} from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipsInput } from "@/components/chips-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meetingDate: z.string().min(1, "Date is required"),
  meetingTime: z.string().min(1, "Time is required"),
  location: z.string().optional().nullable(),
  participants: z.array(z.string()).min(1, "At least one participant is required"),
  agenda: z.string().min(1, "Agenda is required"),
  notes: z.string(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
});

type FormValues = z.infer<typeof meetingSchema>;

export default function MeetingForm() {
  const [matchNew] = useRoute("/meetings/new");
  const [, paramsEdit] = useRoute("/meetings/:id/edit");
  const isEdit = !matchNew && !!paramsEdit?.id;
  const id = isEdit ? Number(paramsEdit!.id) : null;

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meeting, isLoading: isFetching } = useGetMeeting(id!, {
    query: {
      enabled: isEdit && !!id,
      queryKey: getGetMeetingQueryKey(id!),
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      meetingDate: new Date().toISOString().split("T")[0],
      meetingTime: "09:00",
      location: "",
      participants: [],
      agenda: "",
      notes: "",
      tags: [],
      status: "scheduled",
    },
  });

  useEffect(() => {
    if (isEdit && meeting) {
      form.reset({
        title: meeting.title,
        meetingDate: meeting.meetingDate,
        meetingTime: meeting.meetingTime,
        location: meeting.location || "",
        participants: meeting.participants,
        agenda: meeting.agenda,
        notes: meeting.notes,
        tags: meeting.tags,
        status: meeting.status as "scheduled" | "completed" | "cancelled",
      });
    }
  }, [isEdit, meeting, form]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeetingsSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentMeetingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTagBreakdownQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUpcomingMeetingsQueryKey() });
    if (id) {
      queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(id) });
    }
  };

  const createMutation = useCreateMeeting({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Meeting created" });
        invalidateAll();
        navigate(`/meetings/${data.id}`);
      },
      onError: () =>
        toast({ title: "Error creating meeting", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateMeeting({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Meeting updated" });
        invalidateAll();
        navigate(`/meetings/${data.id}`);
      },
      onError: () =>
        toast({ title: "Error updating meeting", variant: "destructive" }),
    },
  });

  const onSubmit = (data: FormValues) => {
    if (isEdit && id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const cancelHref = isEdit ? `/meetings/${id}` : "/meetings";

  if (isEdit && isFetching) {
    return (
      <Layout>
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
        <nav className="mb-8">
          <button
            onClick={() => navigate(cancelHref)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {isEdit ? "Back to meeting" : "Cancel"}
          </button>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? "Edit Meeting" : "New Meeting"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit
              ? "Update the details of your meeting."
              : "Schedule and prepare for a new meeting."}
          </p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6 bg-card border rounded-xl p-6 shadow-sm">
              {/* Title */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Q3 Product Roadmap Sync"
                          className="text-lg font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date */}
              <FormField
                control={form.control}
                name="meetingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time */}
              <FormField
                control={form.control}
                name="meetingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Zoom, Meet, or Room 4B"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Participants */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participants</FormLabel>
                      <FormControl>
                        <ChipsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Type name and press Enter..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <ChipsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="engineering, planning, Q3..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Agenda + Notes */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="agenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Agenda</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          "1. Review last week's action items\n2. Discuss new feature proposals\n3. Blockers"
                        }
                        className="min-h-[150px] resize-y font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Meeting Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Take your notes here..."
                        className="min-h-[300px] resize-y bg-card border rounded-xl shadow-sm text-base leading-relaxed p-6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate(cancelHref)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px]">
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEdit ? "Save Changes" : "Create Meeting"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
