import { Layout } from "@/components/layout";
import { useGetMeetingsSummary, useGetUpcomingMeetings, useGetRecentMeetings, useGetTagBreakdown } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, CheckCircle2, Clock, Tags, ChevronRight } from "lucide-react";
import { MeetingCard } from "@/components/meeting-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetMeetingsSummary();
  const { data: upcoming, isLoading: loadingUpcoming } = useGetUpcomingMeetings();
  const { data: recent, isLoading: loadingRecent } = useGetRecentMeetings();
  const { data: tags, isLoading: loadingTags } = useGetTagBreakdown();

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Overview</h1>
          <p className="text-lg text-muted-foreground">Your team's meeting cadence and history.</p>
        </header>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Meetings" 
            value={summary?.total} 
            loading={loadingSummary} 
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />} 
          />
          <StatCard 
            title="Scheduled" 
            value={summary?.scheduled} 
            loading={loadingSummary} 
            icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
          />
          <StatCard 
            title="Completed" 
            value={summary?.completed} 
            loading={loadingSummary} 
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} 
          />
          <StatCard 
            title="Participants" 
            value={summary?.uniqueParticipants} 
            loading={loadingSummary} 
            icon={<Users className="h-4 w-4 text-muted-foreground" />} 
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Upcoming Meetings</h2>
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                  <Link href="/meetings?status=scheduled">View all <ChevronRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </div>
              
              {loadingUpcoming ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-48 rounded-xl" />
                </div>
              ) : upcoming?.length === 0 ? (
                <div className="p-8 text-center border rounded-xl bg-card/50 text-muted-foreground">
                  <p>No upcoming meetings scheduled.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {upcoming?.slice(0, 4).map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent History</h2>
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                  <Link href="/meetings">View all <ChevronRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </div>
              
              {loadingRecent ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              ) : recent?.length === 0 ? (
                <div className="p-8 text-center border rounded-xl bg-card/50 text-muted-foreground">
                  <p>No meeting history found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recent?.map((meeting) => (
                    <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                      <div className="group flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all">
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">{meeting.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{meeting.meetingDate} &middot; {meeting.status}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tags className="w-5 h-5" />
                  Popular Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTags ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-5/6" />
                  </div>
                ) : tags?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags used yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags?.map((tag) => (
                      <Link key={tag.tag} href={`/meetings?tag=${encodeURIComponent(tag.tag)}`}>
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                          {tag.tag}
                          <span className="ml-1.5 opacity-60 font-normal">{tag.count}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, loading, icon }: { title: string, value?: number, loading?: boolean, icon: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <div className="text-3xl font-bold">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}