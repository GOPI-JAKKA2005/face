/**
 * Offline rule-based intent fallback engine for admin assistant.
 * Activates when no LLM API key is configured or the external provider fails.
 */

import { api } from '../../lib/api.js';

export async function processOfflineRule(query, _pageContext = '/') {
  const q = query.toLowerCase().trim();

  // 1. Summaries / Attendance queries
  if (q.includes('summary') || q.includes('today') || q.includes('who is present')) {
    try {
      const res = await api.get('/attendance/list?limit=50');
      const present = res.summary?.present || 0;
      const late = res.summary?.late || 0;
      const absent = res.summary?.absent || 0;
      const total = present + late + absent;

      return {
        reply: `Here is today's attendance summary:\n\n• **Present (On Time)**: ${present}\n• **Late Arrivals**: ${late}\n• **Absent**: ${absent}\n• **Total Marked**: ${total}\n\nAttendance rate: ${total > 0 ? Math.round(((present + late) / total) * 100) : 0}%`,
        proposal: null
      };
    } catch (_e) {
      return {
        reply: 'Today: 0 present, 0 late, 0 absent. Start scanning on the Kiosk page to record marks.',
        proposal: null
      };
    }
  }

  // 2. Who is late?
  if (q.includes('late')) {
    try {
      const res = await api.get('/attendance/list?status=late&limit=10');
      const items = res.records || [];
      if (items.length === 0) {
        return {
          reply: 'No students were late today! All attendees arrived on time.',
          proposal: null
        };
      }
      const list = items.map(i => `• **${i.name}** (${i.rollNo}) - Late by ${i.lateMinutes} min`).join('\n');
      return {
        reply: `Late arrivals today:\n\n${list}`,
        proposal: null
      };
    } catch (_e) {
      return { reply: 'Could not fetch late arrivals.', proposal: null };
    }
  }

  // 3. Setting modification proposals
  if (q.includes('morning start') || q.includes('session time')) {
    const timeMatch = q.match(/(\d{1,2}:\d{2})/);
    const targetTime = timeMatch ? timeMatch[1].padStart(5, '0') : '09:15';
    return {
      reply: `I can update the Morning session start time to **${targetTime}**. Would you like me to proceed?`,
      proposal: {
        type: 'settings_change',
        title: `Change Morning Start Time to ${targetTime}`,
        endpoint: '/settings',
        method: 'PUT',
        payload: {
          sessions: {
            morning: { start: targetTime }
          }
        }
      }
    };
  }

  // 4. Mark student present proposal
  if (q.includes('mark') && (q.includes('roll') || q.includes('student'))) {
    const rollMatch = q.match(/roll\s*(?:no\.?|number)?\s*([a-zA-Z0-9-]+)/i);
    const targetRoll = rollMatch ? rollMatch[1].toUpperCase() : 'STUDENT';
    return {
      reply: `I have prepared a manual attendance mark for Roll Number **${targetRoll}** for today's current session.`,
      proposal: {
        type: 'manual_mark',
        title: `Manual Mark: Roll ${targetRoll}`,
        endpoint: '/attendance/manual',
        method: 'POST',
        payload: {
          rollNo: targetRoll,
          status: 'present',
          reason: 'Marked via Admin Assistant'
        }
      }
    };
  }

  // 5. Enrolling / Help
  if (q.includes('how to enroll') || q.includes('enrollment')) {
    return {
      reply: `To enroll a new student:\n1. Navigate to **Enroll Face** in the menu.\n2. Have the student face the camera inside the oval guide.\n3. The system captures 8 samples (5 frontal, then slight left & right turns).\n4. After quality checks pass, fill in Name, Roll No, and Mobile.\n5. Tick Biometric Consent and press **Save Student**.`,
      proposal: null
    };
  }

  // Default assistance
  return {
    reply: `I am your FaceAttend Assistant. You can ask me:\n• *"Who was late this morning?"*\n• *"Give me today's summary"*\n• *"How do I enroll a student?"*\n• *"Set morning start to 09:15"*`,
    proposal: null
  };
}
