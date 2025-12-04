import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, RefreshCw, FileText, AlertCircle, Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";

interface CalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: string[];
  description?: string;
  htmlLink: string;
}

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary");
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>("decision");
  const [selectedAudience, setSelectedAudience] = useState<string>("exec");
  const [generatingEventId, setGeneratingEventId] = useState<string | null>(null);

  const { data: statusData, isLoading: statusLoading } = useQuery<{ success: boolean; connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });

  const { data: calendarsData, isLoading: calendarsLoading } = useQuery<{ success: boolean; calendars: CalendarInfo[] }>({
    queryKey: ["/api/calendar/list"],
    enabled: statusData?.connected === true,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<{ success: boolean; events: CalendarEvent[] }>({
    queryKey: ["/api/calendar/events", selectedCalendar],
    enabled: statusData?.connected === true,
  });

  const generateBriefMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("POST", "/api/calendar/generate-brief", {
        calendarId: selectedCalendar,
        eventId,
        meetingType: selectedMeetingType,
        audienceLevel: selectedAudience,
      });
      return response.json();
    },
    onSuccess: (data: { success: boolean; jobId?: number; event?: { summary: string } }) => {
      toast({
        title: "Brief generation started",
        description: `Generating brief for "${data.event?.summary || 'event'}". You'll be redirected when ready.`,
      });
      if (data.jobId) {
        pollForCompletion(data.jobId);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate brief",
        description: error.message,
        variant: "destructive",
      });
      setGeneratingEventId(null);
    },
  });

  const pollForCompletion = async (jobId: number) => {
    const poll = async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      
      if (data.job?.status === "completed" && data.brief?.id) {
        toast({
          title: "Brief ready",
          description: "Your meeting brief has been generated.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/briefs"] });
        navigate(`/brief/${data.brief.id}`);
        setGeneratingEventId(null);
      } else if (data.job?.status === "failed") {
        toast({
          title: "Brief generation failed",
          description: data.job.error || "An error occurred",
          variant: "destructive",
        });
        setGeneratingEventId(null);
      } else {
        setTimeout(poll, 1500);
      }
    };
    poll();
  };

  const handleGenerateBrief = (event: CalendarEvent) => {
    setGeneratingEventId(event.id);
    generateBriefMutation.mutate(event.id);
  };

  const formatEventTime = (start: string, end: string) => {
    try {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      const isSameDay = format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");
      
      if (isSameDay) {
        return `${format(startDate, "MMM d, yyyy")} · ${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
      }
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background py-8 px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!statusData?.connected) {
    return (
      <div className="min-h-screen bg-background py-8 px-8">
        <div className="max-w-5xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Google Calendar Not Connected</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Connect your Google Calendar to automatically generate briefs from your upcoming meetings.
              </p>
              <Button
                onClick={() => window.location.reload()}
                data-testid="button-refresh-calendar"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Connection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-calendar-title">
              Calendar Events
            </h1>
            <p className="text-muted-foreground">
              Select meetings to generate AI-powered briefs
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchEvents()}
            data-testid="button-refresh-events"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>Configure calendar source and brief options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Calendar</label>
                <Select
                  value={selectedCalendar}
                  onValueChange={setSelectedCalendar}
                >
                  <SelectTrigger data-testid="select-calendar">
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      calendarsData?.calendars?.map((cal) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary && "(Primary)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Type</label>
                <Select
                  value={selectedMeetingType}
                  onValueChange={setSelectedMeetingType}
                >
                  <SelectTrigger data-testid="select-meeting-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decision">Decision</SelectItem>
                    <SelectItem value="discussion">Discussion</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Audience</label>
                <Select
                  value={selectedAudience}
                  onValueChange={setSelectedAudience}
                >
                  <SelectTrigger data-testid="select-audience">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exec">Executive</SelectItem>
                    <SelectItem value="ic">Individual Contributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">Upcoming Events</h2>
          
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : eventsData?.events?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No upcoming events found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {eventsData?.events?.map((event) => (
                <Card key={event.id} data-testid={`card-event-${event.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate" data-testid={`text-event-title-${event.id}`}>
                            {event.summary}
                          </h3>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Link2 className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatEventTime(event.start, event.end)}
                          </span>
                          {event.attendees?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {event.description.replace(/<[^>]*>/g, "").substring(0, 150)}...
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateBrief(event)}
                        disabled={generatingEventId === event.id}
                        data-testid={`button-generate-${event.id}`}
                      >
                        {generatingEventId === event.id ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Brief
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
