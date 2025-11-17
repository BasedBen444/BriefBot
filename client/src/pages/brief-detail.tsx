import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BriefDisplay } from "@/components/brief-display";
import type { Brief } from "@shared/schema";

interface DbBrief {
  id: number;
  meetingId: number;
  goal: string;
  context: string[];
  options: Array<{ option: string; pros: string[]; cons: string[] }>;
  risksTradeoffs: string[];
  decisions: string[];
  actionChecklist: Array<{ owner: string; task: string; dueDate: string }>;
  wordCount: number;
  createdAt: string;
  meeting: {
    id: number;
    title: string;
    attendees: string;
    meetingType: string;
    audienceLevel: string;
    createdAt: string;
  } | null;
}

export default function BriefDetail() {
  const params = useParams();
  const briefId = params.id;

  const { data, isLoading, error } = useQuery<{ success: boolean; brief: DbBrief }>({
    queryKey: ["/api/briefs", briefId],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/history">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Button>
            </Link>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.brief) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/history">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Brief not found</h2>
            <p className="text-muted-foreground mb-4">
              The brief you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/history">
              <Button data-testid="button-view-all">View All Briefs</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const brief: Brief = {
    goal: data.brief.goal,
    context: data.brief.context,
    options: data.brief.options,
    risksTradeoffs: data.brief.risksTradeoffs,
    decisions: data.brief.decisions,
    actionChecklist: data.brief.actionChecklist,
    wordCount: data.brief.wordCount,
    generatedAt: data.brief.createdAt,
  };

  // Use the actual meeting metadata from the database
  const metadata = {
    title: data.brief.meeting?.title || brief.goal,
    attendees: data.brief.meeting?.attendees || "",
    meetingType: (data.brief.meeting?.meetingType as any) || "decision",
    audienceLevel: (data.brief.meeting?.audienceLevel as any) || "exec",
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/history">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>
          </Link>
        </div>
        
        <BriefDisplay brief={brief} metadata={metadata} />
      </div>
    </div>
  );
}
