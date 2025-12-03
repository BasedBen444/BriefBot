import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileJson, FileText, RefreshCw, FileCheck } from "lucide-react";
import type { Brief, MeetingMetadata } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface BriefDisplayProps {
  brief: Brief;
  metadata: MeetingMetadata;
  onGenerateAnother?: () => void;
}

export function BriefDisplay({ brief, metadata, onGenerateAnother }: BriefDisplayProps) {
  const { toast } = useToast();

  const exportAsText = () => {
    const text = formatBriefAsText(brief, metadata);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brief-${metadata.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Brief exported",
      description: "Your brief has been downloaded as a text file.",
    });
  };

  const exportAsJSON = () => {
    const data = { metadata, brief };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brief-${metadata.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Brief exported",
      description: "Your brief has been downloaded as JSON.",
    });
  };

  const copyToClipboard = async () => {
    const text = formatBriefAsText(brief, metadata);
    await navigator.clipboard.writeText(text);
    
    toast({
      title: "Copied to clipboard",
      description: "Brief content copied successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1" data-testid="text-brief-title">
            {metadata.title}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-meeting-type">
              {metadata.meetingType.charAt(0).toUpperCase() + metadata.meetingType.slice(1)}
            </Badge>
            <Badge variant="secondary" data-testid="badge-audience-level">
              {metadata.audienceLevel === "exec" ? "Executive" : "IC"} Brief
            </Badge>
            <span className="text-sm text-muted-foreground" data-testid="text-word-count">
              {brief.wordCount} words
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            data-testid="button-copy-clipboard"
          >
            <FileText className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsText}
            data-testid="button-export-text"
          >
            <Download className="w-4 h-4 mr-2" />
            Export TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsJSON}
            data-testid="button-export-json"
          >
            <FileJson className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Brief Content */}
      <Card className="p-8 max-w-3xl" data-testid="card-brief-content">
        <div className="space-y-8">
          {/* Goal */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Goal
            </h3>
            <p className="text-base leading-relaxed" data-testid="text-goal">
              {brief.goal}
            </p>
          </section>

          <Separator />

          {/* Context */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Context
            </h3>
            <ul className="space-y-2 list-disc list-inside" data-testid="list-context">
              {brief.context.map((item, index) => (
                <li key={index} className="text-base leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Options */}
          {brief.options.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Options
                </h3>
                <div className="space-y-4" data-testid="list-options">
                  {brief.options.map((option, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-base font-medium">{option.option}</p>
                      {option.pros.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Pros:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {option.pros.map((pro, i) => (
                              <li key={i} className="text-sm leading-relaxed">{pro}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {option.cons.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Cons:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {option.cons.map((con, i) => (
                              <li key={i} className="text-sm leading-relaxed">{con}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Risks & Trade-offs */}
          {brief.risksTradeoffs.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Risks & Trade-offs
                </h3>
                <ul className="space-y-2 list-disc list-inside" data-testid="list-risks">
                  {brief.risksTradeoffs.map((item, index) => (
                    <li key={index} className="text-base leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <Separator />

          {/* Decisions */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Decision(s) to Make
            </h3>
            <ul className="space-y-2 list-disc list-inside" data-testid="list-decisions">
              {brief.decisions.map((item, index) => (
                <li key={index} className="text-base leading-relaxed font-medium">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* Action Checklist */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Action Checklist
            </h3>
            <div className="space-y-2 text-sm" data-testid="list-actions">
              {brief.actionChecklist.map((action, index) => (
                <div key={index} className="font-mono leading-relaxed flex items-center gap-2">
                  <span>{action.owner} • {action.task} • {action.dueDate}</span>
                  {action.source && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {action.source}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Sources */}
          {brief.sources && brief.sources.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Sources
                </h3>
                <div className="space-y-2 text-sm" data-testid="list-sources">
                  {brief.sources.map((source, index) => (
                    <div key={index} className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{source.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {source.filename}
                      </Badge>
                      {source.section && (
                        <span className="text-muted-foreground">
                          — {source.section}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  All content in this brief is derived from the uploaded documents above.
                </p>
              </section>
            </>
          )}
        </div>
      </Card>

      {/* Attendees */}
      <Card className="p-6">
        <h3 className="text-sm font-medium mb-2">Attendees</h3>
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-attendees">
          {metadata.attendees}
        </p>
      </Card>

      {/* Generate Another Button */}
      {onGenerateAnother && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onGenerateAnother}
            data-testid="button-generate-another"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Another Brief
          </Button>
        </div>
      )}
    </div>
  );
}

function formatBriefAsText(brief: Brief, metadata: MeetingMetadata): string {
  let text = `MEETING BRIEF: ${metadata.title}\n`;
  text += `Type: ${metadata.meetingType.charAt(0).toUpperCase() + metadata.meetingType.slice(1)}\n`;
  text += `Audience: ${metadata.audienceLevel === "exec" ? "Executive" : "Individual Contributor"}\n`;
  text += `Generated: ${new Date(brief.generatedAt).toLocaleString()}\n`;
  text += `\n${"=".repeat(60)}\n\n`;

  text += `GOAL\n${brief.goal}\n\n`;

  text += `CONTEXT\n`;
  brief.context.forEach(item => text += `• ${item}\n`);
  text += `\n`;

  if (brief.options.length > 0) {
    text += `OPTIONS\n`;
    brief.options.forEach(option => {
      text += `\n${option.option}\n`;
      if (option.pros.length > 0) {
        text += `  Pros:\n`;
        option.pros.forEach(pro => text += `    • ${pro}\n`);
      }
      if (option.cons.length > 0) {
        text += `  Cons:\n`;
        option.cons.forEach(con => text += `    • ${con}\n`);
      }
    });
    text += `\n`;
  }

  if (brief.risksTradeoffs.length > 0) {
    text += `RISKS & TRADE-OFFS\n`;
    brief.risksTradeoffs.forEach(item => text += `• ${item}\n`);
    text += `\n`;
  }

  text += `DECISION(S) TO MAKE\n`;
  brief.decisions.forEach(item => text += `• ${item}\n`);
  text += `\n`;

  text += `ACTION CHECKLIST\n`;
  brief.actionChecklist.forEach(action => {
    let line = `${action.owner} • ${action.task} • ${action.dueDate}`;
    if (action.source) {
      line += ` [${action.source}]`;
    }
    text += `${line}\n`;
  });

  if (brief.sources && brief.sources.length > 0) {
    text += `\nSOURCES\n`;
    brief.sources.forEach(source => {
      let line = `• ${source.label}: ${source.filename}`;
      if (source.section) {
        line += ` — ${source.section}`;
      }
      text += `${line}\n`;
    });
    text += `\n(All content derived from uploaded documents)\n`;
  }

  text += `\n${"=".repeat(60)}\n\n`;
  text += `ATTENDEES\n${metadata.attendees}\n`;

  return text;
}
