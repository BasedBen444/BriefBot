import { google, calendar_v3 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  start: string;
  end: string;
  attendees: string[];
  htmlLink: string;
  attachments: Array<{ fileUrl: string; title: string; mimeType: string }>;
}

export async function listCalendars(): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const calendar = await getCalendarClient();
  const response = await calendar.calendarList.list();
  
  return (response.data.items || []).map(cal => ({
    id: cal.id || '',
    summary: cal.summary || 'Unnamed Calendar',
    primary: cal.primary || false
  }));
}

export async function getUpcomingEvents(calendarId: string = 'primary', maxResults: number = 10): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient();
  
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: oneWeekFromNow.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || []).map(event => ({
    id: event.id || '',
    summary: event.summary || 'Untitled Event',
    description: event.description || null,
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    attendees: (event.attendees || []).map(a => {
      const name = a.displayName || a.email?.split('@')[0] || 'Unknown';
      return name;
    }),
    htmlLink: event.htmlLink || '',
    attachments: (event.attachments || []).map(att => ({
      fileUrl: att.fileUrl || '',
      title: att.title || 'Attachment',
      mimeType: att.mimeType || 'application/octet-stream'
    }))
  }));
}

export async function getEventById(calendarId: string, eventId: string): Promise<CalendarEvent | null> {
  const calendar = await getCalendarClient();
  
  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    const event = response.data;
    return {
      id: event.id || '',
      summary: event.summary || 'Untitled Event',
      description: event.description || null,
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      attendees: (event.attendees || []).map(a => {
        const name = a.displayName || a.email?.split('@')[0] || 'Unknown';
        return name;
      }),
      htmlLink: event.htmlLink || '',
      attachments: (event.attachments || []).map(att => ({
        fileUrl: att.fileUrl || '',
        title: att.title || 'Attachment',
        mimeType: att.mimeType || 'application/octet-stream'
      }))
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

export async function updateEventDescription(calendarId: string, eventId: string, briefSummary: string): Promise<boolean> {
  const calendar = await getCalendarClient();
  
  try {
    const event = await calendar.events.get({ calendarId, eventId });
    const existingDescription = event.data.description || '';
    
    const briefMarker = '--- BriefBot Summary ---';
    let newDescription: string;
    
    if (existingDescription.includes(briefMarker)) {
      const beforeMarker = existingDescription.split(briefMarker)[0].trim();
      newDescription = beforeMarker + '\n\n' + briefMarker + '\n' + briefSummary;
    } else {
      newDescription = existingDescription + '\n\n' + briefMarker + '\n' + briefSummary;
    }
    
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        description: newDescription
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating event description:', error);
    return false;
  }
}

export async function isCalendarConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
