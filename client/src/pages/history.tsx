import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Users, Clock } from "lucide-react";
import { Link } from "wouter";
import type { DbBrief } from "@shared/schema";
import { format } from "date-fns";

interface BriefWithMeetingData {
  id: number;
  meetingId: number;
  goal: string;
  context: string[];
  options: Array<{ option: string; pros: string[]; cons: string[] }>;
  risksTradeoffs: string[];
  decisions: string[];
  actionChecklist: Array<{ owner: string; task: string; dueDate: string }>;
  wordCount: number;
  createdAt: Date;
  meeting: {
    id: number;
    title: string;
    attendees: string;
    meetingType: string;
    audienceLevel: string;
    createdAt: Date;
  } | null;
}

export default function History() {
  const { data, isLoading } = useQuery<{ success: boolean; briefs: BriefWithMeetingData[] }>({
    queryKey: ["/api/briefs"],
  });

  const briefs = data?.briefs || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2">Brief History</h1>
            <p className="text-muted-foreground">Loading your generated briefs...</p>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2" data-testid="text-heading">Brief History</h1>
            <p className="text-muted-foreground">
              View all your previously generated meeting briefs
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-new-brief">
              <FileText className="mr-2 h-4 w-4" />
              New Brief
            </Button>
          </Link>
        </div>

        {briefs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No briefs yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first brief to get started
              </p>
              <Link href="/">
                <Button data-testid="button-create-first">Create Your First Brief</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {briefs.map((brief) => (
              <Card key={brief.id} className="hover-elevate" data-testid={`card-brief-${brief.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{brief.meeting?.title || brief.goal}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(brief.createdAt), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(brief.createdAt), "h:mm a")}
                        </span>
                        <Badge variant="outline" data-testid={`badge-word-count-${brief.id}`}>
                          {brief.wordCount} words
                        </Badge>
                        {brief.meeting && (
                          <Badge variant="secondary">
                            {brief.meeting.meetingType.charAt(0).toUpperCase() + brief.meeting.meetingType.slice(1)}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid={`button-view-brief-${brief.id}`}
                    >
                      <Link href={`/brief/${brief.id}`}>View Brief</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Context Preview */}
                    {brief.context.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Context
                        </h4>
                        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                          {brief.context.slice(0, 2).map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                          {brief.context.length > 2 && (
                            <li className="text-xs">+{brief.context.length - 2} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Decisions Preview */}
                    {brief.decisions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Decisions
                        </h4>
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          {brief.decisions.slice(0, 2).map((decision, index) => (
                            <li key={index}>{decision}</li>
                          ))}
                          {brief.decisions.length > 2 && (
                            <li className="text-xs text-muted-foreground">
                              +{brief.decisions.length - 2} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Action Items Count */}
                    {brief.actionChecklist.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{brief.actionChecklist.length} action items</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
