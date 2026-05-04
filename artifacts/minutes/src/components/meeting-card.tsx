import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import type { Meeting } from "@workspace/api-client-react";

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [, navigate] = useLocation();

  return (
    <Card
      className="hover:shadow-md transition-shadow group flex flex-col cursor-pointer"
      onClick={() => navigate(`/meetings/${meeting.id}`)}
    >
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 gap-4">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {meeting.title}
          </h3>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5" />
              {format(parseISO(meeting.meetingDate), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-3.5 w-3.5" />
              {meeting.meetingTime}
            </span>
          </div>
        </div>
        <Badge
          variant={
            meeting.status === "completed"
              ? "default"
              : meeting.status === "cancelled"
                ? "destructive"
                : "secondary"
          }
          className="shrink-0 capitalize"
        >
          {meeting.status}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <div className="space-y-3">
          {meeting.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{meeting.location}</span>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {meeting.participants.slice(0, 3).map((p) => (
                <span
                  key={p}
                  className="bg-secondary px-1.5 py-0.5 rounded-sm text-xs font-medium text-secondary-foreground"
                >
                  {p}
                </span>
              ))}
              {meeting.participants.length > 3 && (
                <span className="text-xs mt-0.5">
                  +{meeting.participants.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {meeting.tags && meeting.tags.length > 0 && (
        <CardFooter className="pt-0 border-t mt-auto px-6 py-3">
          <div className="flex flex-wrap gap-1">
            {meeting.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] uppercase font-semibold text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
