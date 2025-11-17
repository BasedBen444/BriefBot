// Referenced from blueprint:javascript_database
import { 
  type User, 
  type InsertUser,
  type Meeting,
  type InsertMeeting,
  type DbBrief,
  type InsertBrief,
  type Document,
  type InsertDocument,
  type DecisionAnalytic,
  type InsertDecisionAnalytic,
  users,
  meetings,
  briefs,
  documents,
  decisionAnalytics,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Meeting methods
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByUser(userId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  
  // Brief methods
  getBrief(id: number): Promise<DbBrief | undefined>;
  getBriefsByMeeting(meetingId: number): Promise<DbBrief[]>;
  getBriefsByUser(userId: number): Promise<DbBrief[]>;
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
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Meeting methods
  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async getMeetingsByUser(userId: number): Promise<Meeting[]> {
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

  async getBriefsByUser(userId: number): Promise<any[]> {
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
}

export const storage = new DatabaseStorage();
