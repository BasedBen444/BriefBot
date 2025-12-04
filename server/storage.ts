// Referenced from blueprint:javascript_database and blueprint:javascript_log_in_with_replit
import { 
  type User, 
  type UpsertUser,
  type Meeting,
  type InsertMeeting,
  type DbBrief,
  type InsertBrief,
  type Document,
  type InsertDocument,
  type DecisionAnalytic,
  type InsertDecisionAnalytic,
  type BriefJob,
  type InsertBriefJob,
  type CalendarEventRecord,
  type InsertCalendarEvent,
  users,
  meetings,
  briefs,
  documents,
  decisionAnalytics,
  briefJobs,
  calendarEvents,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Meeting methods
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByUser(userId: string): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  
  // Brief methods
  getBrief(id: number): Promise<DbBrief | undefined>;
  getBriefsByMeeting(meetingId: number): Promise<DbBrief[]>;
  getBriefsByUser(userId: string): Promise<DbBrief[]>;
  getAllBriefs(): Promise<DbBrief[]>;
  createBrief(brief: InsertBrief): Promise<DbBrief>;
  
  // Document methods
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByMeeting(meetingId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Analytics methods
  getAnalyticsByBrief(briefId: number): Promise<DecisionAnalytic | undefined>;
  getAnalyticsByMeeting(meetingId: number): Promise<DecisionAnalytic[]>;
  createAnalytic(analytic: InsertDecisionAnalytic): Promise<DecisionAnalytic>;
  updateAnalytic(id: number, data: Partial<InsertDecisionAnalytic>): Promise<DecisionAnalytic>;
  
  // Job methods
  getJob(id: number): Promise<BriefJob | undefined>;
  createJob(job: InsertBriefJob): Promise<BriefJob>;
  updateJob(id: number, data: Partial<InsertBriefJob>): Promise<BriefJob>;
  getPendingJobs(): Promise<BriefJob[]>;
  
  // Calendar event methods
  getCalendarEvent(calendarId: string, eventId: string): Promise<CalendarEventRecord | undefined>;
  getCalendarEventsByBrief(briefId: number): Promise<CalendarEventRecord[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEventRecord>;
  updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<CalendarEventRecord>;
}

export class DatabaseStorage implements IStorage {
  // User methods (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Meeting methods
  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async getMeetingsByUser(userId: string): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.userId, userId));
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetings)
      .values(insertMeeting)
      .returning();
    return meeting;
  }
  
  // Brief methods
  async getBrief(id: number): Promise<any | undefined> {
    const result = await db
      .select({
        brief: briefs,
        meeting: meetings,
      })
      .from(briefs)
      .leftJoin(meetings, eq(briefs.meetingId, meetings.id))
      .where(eq(briefs.id, id));
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].brief,
      meeting: result[0].meeting,
    };
  }

  async getBriefsByMeeting(meetingId: number): Promise<any[]> {
    const result = await db
      .select({
        brief: briefs,
        meeting: meetings,
      })
      .from(briefs)
      .leftJoin(meetings, eq(briefs.meetingId, meetings.id))
      .where(eq(briefs.meetingId, meetingId));
    
    return result.map(r => ({
      ...r.brief,
      meeting: r.meeting,
    }));
  }

  async getBriefsByUser(userId: string): Promise<any[]> {
    const result = await db
      .select({
        brief: briefs,
        meeting: meetings,
      })
      .from(briefs)
      .leftJoin(meetings, eq(briefs.meetingId, meetings.id))
      .where(eq(briefs.userId, userId))
      .orderBy(desc(briefs.createdAt));
    
    return result.map(r => ({
      ...r.brief,
      meeting: r.meeting,
    }));
  }

  async getAllBriefs(): Promise<any[]> {
    const result = await db
      .select({
        brief: briefs,
        meeting: meetings,
      })
      .from(briefs)
      .leftJoin(meetings, eq(briefs.meetingId, meetings.id))
      .orderBy(desc(briefs.createdAt));
    
    return result.map(r => ({
      ...r.brief,
      meeting: r.meeting,
    }));
  }

  async createBrief(insertBrief: InsertBrief): Promise<DbBrief> {
    const [brief] = await db
      .insert(briefs)
      .values(insertBrief)
      .returning();
    return brief;
  }
  
  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentsByMeeting(meetingId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.meetingId, meetingId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }
  
  // Analytics methods
  async getAnalyticsByBrief(briefId: number): Promise<DecisionAnalytic | undefined> {
    const [analytic] = await db.select().from(decisionAnalytics).where(eq(decisionAnalytics.briefId, briefId));
    return analytic || undefined;
  }

  async getAnalyticsByMeeting(meetingId: number): Promise<DecisionAnalytic[]> {
    return await db.select().from(decisionAnalytics).where(eq(decisionAnalytics.meetingId, meetingId));
  }

  async createAnalytic(insertAnalytic: InsertDecisionAnalytic): Promise<DecisionAnalytic> {
    const [analytic] = await db
      .insert(decisionAnalytics)
      .values(insertAnalytic)
      .returning();
    return analytic;
  }

  async updateAnalytic(id: number, data: Partial<InsertDecisionAnalytic>): Promise<DecisionAnalytic> {
    const [analytic] = await db
      .update(decisionAnalytics)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(decisionAnalytics.id, id))
      .returning();
    return analytic;
  }
  
  // Job methods
  async getJob(id: number): Promise<BriefJob | undefined> {
    const [job] = await db.select().from(briefJobs).where(eq(briefJobs.id, id));
    return job || undefined;
  }

  async createJob(insertJob: InsertBriefJob): Promise<BriefJob> {
    const [job] = await db
      .insert(briefJobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateJob(id: number, data: Partial<InsertBriefJob>): Promise<BriefJob> {
    const [job] = await db
      .update(briefJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(briefJobs.id, id))
      .returning();
    return job;
  }

  async getPendingJobs(): Promise<BriefJob[]> {
    return await db
      .select()
      .from(briefJobs)
      .where(eq(briefJobs.status, "pending"))
      .orderBy(briefJobs.createdAt);
  }
  
  // Calendar event methods
  async getCalendarEvent(calendarId: string, eventId: string): Promise<CalendarEventRecord | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.calendarId, calendarId),
          eq(calendarEvents.eventId, eventId)
        )
      );
    return event || undefined;
  }

  async getCalendarEventsByBrief(briefId: number): Promise<CalendarEventRecord[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.briefId, briefId));
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEventRecord> {
    const [event] = await db
      .insert(calendarEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<CalendarEventRecord> {
    const [event] = await db
      .update(calendarEvents)
      .set({ ...data, lastSyncedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return event;
  }
}

export const storage = new DatabaseStorage();
