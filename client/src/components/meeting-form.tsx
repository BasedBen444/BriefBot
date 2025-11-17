import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingMetadataSchema, type MeetingMetadata } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface MeetingFormProps {
  onSubmit: (data: MeetingMetadata) => void;
  isGenerating: boolean;
}

export function MeetingForm({ onSubmit, isGenerating }: MeetingFormProps) {
  const form = useForm<MeetingMetadata>({
    resolver: zodResolver(meetingMetadataSchema),
    defaultValues: {
      title: "",
      attendees: "",
      meetingType: "decision",
      audienceLevel: "exec",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Card className="p-6 md:p-8">
      <h3 className="text-xl font-semibold mb-6">Meeting Details</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Meeting Title
          </Label>
          <Input
            id="title"
            placeholder="e.g., Q1 Product Launch Decision"
            {...form.register("title")}
            data-testid="input-meeting-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Attendees */}
        <div className="space-y-2">
          <Label htmlFor="attendees" className="text-sm font-medium">
            Attendees
          </Label>
          <Textarea
            id="attendees"
            placeholder="e.g., Sarah Chen (PM), Michael Rodriguez (Eng Lead), Lisa Wang (Design)"
            className="resize-none"
            rows={3}
            {...form.register("attendees")}
            data-testid="input-attendees"
          />
          {form.formState.errors.attendees && (
            <p className="text-sm text-destructive">{form.formState.errors.attendees.message}</p>
          )}
        </div>

        {/* Meeting Type & Audience Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meetingType" className="text-sm font-medium">
              Meeting Type
            </Label>
            <Select
              value={form.watch("meetingType")}
              onValueChange={(value) => form.setValue("meetingType", value as any)}
            >
              <SelectTrigger id="meetingType" data-testid="select-meeting-type">
                <SelectValue />
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

          {/* Audience Level */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Audience Level</Label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="exec"
                  {...form.register("audienceLevel")}
                  className="w-4 h-4"
                  data-testid="radio-audience-exec"
                />
                <span className="text-sm">Executive</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="ic"
                  {...form.register("audienceLevel")}
                  className="w-4 h-4"
                  data-testid="radio-audience-ic"
                />
                <span className="text-sm">Individual Contributor</span>
              </label>
            </div>
          </div>
        </div>

        {/* Helper Text */}
        <div className="rounded-lg bg-accent/50 p-4 border border-accent-border">
          <p className="text-sm text-muted-foreground">
            <strong>Executive briefs</strong> emphasize options and risks with minimal context. 
            <strong> IC briefs</strong> include more implementation details and constraints.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={isGenerating || !form.formState.isValid}
          data-testid="button-generate-brief"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Brief
        </Button>
      </form>
    </Card>
  );
}
