import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Users, RefreshCw, FileText, AlertCircle, Link2, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useCallback, useRef } from "react";

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

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt", ".csv", ".md", ".xls", ".xlsx"];

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary");
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>("decision");
  const [selectedAudience, setSelectedAudience] = useState<string>("exec");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [generatingEventId, setGeneratingEventId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async ({ eventId, files }: { eventId: string; files: File[] }) => {
      const formData = new FormData();
      formData.append("calendarId", selectedCalendar);
      formData.append("eventId", eventId);
      formData.append("meetingType", selectedMeetingType);
      formData.append("audienceLevel", selectedAudience);
      
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/calendar/generate-brief", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      return response.json();
    },
    onSuccess: (data: { success: boolean; jobId?: number; existingBriefId?: number; event?: { summary: string } }) => {
      if (data.existingBriefId) {
        toast({
          title: "Brief already exists",
          description: "Redirecting to existing brief...",
        });
        navigate(`/brief/${data.existingBriefId}`);
        setGeneratingEventId(null);
        setExpandedEventId(null);
        setUploadedFiles([]);
        return;
      }
      
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
      setGenerationProgress(0);
    },
  });

  const pollForCompletion = async (jobId: number) => {
    const MAX_ATTEMPTS = 60;
    const BASE_DELAY = 1500;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        if (data.job?.progress) {
          setGenerationProgress(data.job.progress);
        }
        
        if (data.job?.status === "completed" && data.brief?.id) {
          toast({
            title: "Brief ready",
            description: "Your meeting brief has been generated.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/briefs"] });
          navigate(`/brief/${data.brief.id}`);
          setGeneratingEventId(null);
          setExpandedEventId(null);
          setUploadedFiles([]);
          setGenerationProgress(0);
          return;
        } else if (data.job?.status === "failed") {
          toast({
            title: "Brief generation failed",
            description: data.job.error || "An error occurred",
            variant: "destructive",
          });
          setGeneratingEventId(null);
          setGenerationProgress(0);
          return;
        }
        
        if (attempts >= MAX_ATTEMPTS) {
          toast({
            title: "Generation timeout",
            description: "Brief generation is taking too long. Please check the history page later.",
            variant: "destructive",
          });
          setGeneratingEventId(null);
          setGenerationProgress(0);
          return;
        }
        
        const delay = Math.min(BASE_DELAY * Math.pow(1.1, attempts - 1), 5000);
        setTimeout(poll, delay);
      } catch (error) {
        if (attempts >= MAX_ATTEMPTS) {
          toast({
            title: "Connection error",
            description: "Failed to check generation status. Please check the history page.",
            variant: "destructive",
          });
          setGeneratingEventId(null);
          setGenerationProgress(0);
          return;
        }
        const delay = Math.min(BASE_DELAY * Math.pow(1.5, attempts - 1), 10000);
        setTimeout(poll, delay);
      }
    };
    poll();
  };

  const handleEventClick = (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      setUploadedFiles([]);
    } else {
      setExpandedEventId(eventId);
      setUploadedFiles([]);
    }
  };

  const handleGenerateBrief = (event: CalendarEvent) => {
    setGeneratingEventId(event.id);
    setGenerationProgress(0);
    generateBriefMutation.mutate({ eventId: event.id, files: uploadedFiles });
  };

  const validateFile = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType = ACCEPTED_FILE_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(extension);
    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
    return isValidType && isValidSize;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file) => {
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were not added",
        description: `Invalid files: ${invalidFiles.join(", ")}. Max 10MB, supported formats: PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, MD`,
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              Select a meeting and attach documents to generate an AI-powered brief
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
              {eventsData?.events?.map((event) => {
                const isExpanded = expandedEventId === event.id;
                const isGenerating = generatingEventId === event.id;
                
                return (
                  <Card 
                    key={event.id} 
                    data-testid={`card-event-${event.id}`}
                    className={isExpanded ? "ring-2 ring-primary" : ""}
                  >
                    <CardContent className="py-4">
                      <div 
                        className="flex items-start justify-between gap-4 cursor-pointer"
                        onClick={() => !isGenerating && handleEventClick(event.id)}
                        data-testid={`event-header-${event.id}`}
                      >
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
                                onClick={(e) => e.stopPropagation()}
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
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {event.description && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Description</label>
                              <p className="text-sm mt-1">
                                {event.description.replace(/<[^>]*>/g, "").substring(0, 300)}
                                {event.description.length > 300 && "..."}
                              </p>
                            </div>
                          )}

                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Supporting Documents <span className="text-muted-foreground font-normal">(optional)</span>
                            </label>
                            <div
                              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                              }`}
                              onDrop={handleDrop}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              data-testid={`dropzone-${event.id}`}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_EXTENSIONS.join(",")}
                                onChange={(e) => handleFileSelect(e.target.files)}
                                className="hidden"
                                data-testid={`file-input-${event.id}`}
                              />
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground mb-1">
                                Drag files here or{" "}
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() => fileInputRef.current?.click()}
                                  data-testid={`button-browse-${event.id}`}
                                >
                                  browse
                                </button>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, MD (max 10MB each)
                              </p>
                            </div>

                            {uploadedFiles.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {uploadedFiles.map((file, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                                    data-testid={`file-item-${index}`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm truncate">{file.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {formatFileSize(file.size)}
                                      </Badge>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 flex-shrink-0"
                                      onClick={() => removeFile(index)}
                                      data-testid={`button-remove-file-${index}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {isGenerating && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Generating brief...</span>
                                <span className="font-medium">{generationProgress}%</span>
                              </div>
                              <Progress value={generationProgress} className="h-2" />
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpandedEventId(null);
                                setUploadedFiles([]);
                              }}
                              disabled={isGenerating}
                              data-testid={`button-cancel-${event.id}`}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleGenerateBrief(event)}
                              disabled={isGenerating}
                              data-testid={`button-generate-${event.id}`}
                            >
                              {isGenerating ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Generate Brief
                                  {uploadedFiles.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
