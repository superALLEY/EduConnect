// Helper functions for schedule page

export interface ScheduleEvent {
  id: string;
  title: string;
  type: "session" | "événement" | "tutoring";
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  instructor?: string;
  color: string;
  startHour: number;
  duration: number;
  date: string;
  isTutoring?: boolean;
  isEvent?: boolean;
  isGroupMeet?: boolean;
  isCourse?: boolean;
  description?: string;
  participants?: string[];
  maxParticipants?: number;
}

export interface PositionedEvent extends ScheduleEvent {
  column: number;
  totalColumns: number;
}

/**
 * Group overlapping events and assign them columns for display
 * This allows multiple events at the same time to be shown side by side
 */
export function getPositionedEvents(events: ScheduleEvent[], day: number, timeSlot: number): PositionedEvent[] {
  // Filter events for this specific day and starting at this time slot
  const eventsAtTime = events.filter(
    event => event.day === day && event.startHour === timeSlot
  );

  if (eventsAtTime.length === 0) return [];
  if (eventsAtTime.length === 1) {
    return [{
      ...eventsAtTime[0],
      column: 0,
      totalColumns: 1
    }];
  }

  // Find all events that overlap with any event at this time
  const overlappingGroups: ScheduleEvent[][] = [];
  
  eventsAtTime.forEach(event => {
    const eventEndTime = getTimeInMinutes(event.endTime);
    
    // Find all events that overlap with this event
    const overlapping = events.filter(otherEvent => {
      if (otherEvent.id === event.id || otherEvent.day !== day) return false;
      
      const otherStart = getTimeInMinutes(otherEvent.startTime);
      const otherEnd = getTimeInMinutes(otherEvent.endTime);
      const thisStart = getTimeInMinutes(event.startTime);
      const thisEnd = eventEndTime;
      
      // Check if they overlap
      return (otherStart < thisEnd && otherEnd > thisStart);
    });
    
    overlappingGroups.push([event, ...overlapping]);
  });

  // Find the maximum group size (this is how many columns we need)
  const maxOverlap = Math.max(...overlappingGroups.map(group => group.length));

  // Assign columns to each event
  const positioned: PositionedEvent[] = [];
  const assignedColumns = new Map<string, number>();

  eventsAtTime.forEach((event, index) => {
    // Assign column based on index, wrapping around if needed
    const column = index % maxOverlap;
    assignedColumns.set(event.id, column);
    
    positioned.push({
      ...event,
      column,
      totalColumns: maxOverlap
    });
  });

  return positioned;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function getTimeInMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get all events for a specific day and time range, including overlapping events
 */
export function getEventsForTimeSlot(
  events: ScheduleEvent[], 
  day: number, 
  timeSlot: number
): PositionedEvent[] {
  const slotStartMinutes = (timeSlot + 8) * 60; // timeSlot 0 = 08:00
  const slotEndMinutes = slotStartMinutes + 60;
  
  // Find all events that overlap with this time slot
  const overlappingEvents = events.filter(event => {
    if (event.day !== day) return false;
    
    const eventStart = getTimeInMinutes(event.startTime);
    const eventEnd = getTimeInMinutes(event.endTime);
    
    // Event overlaps if it starts before slot ends AND ends after slot starts
    return eventStart < slotEndMinutes && eventEnd > slotStartMinutes;
  });

  if (overlappingEvents.length === 0) return [];

  // Sort by start time
  overlappingEvents.sort((a, b) => {
    const aStart = getTimeInMinutes(a.startTime);
    const bStart = getTimeInMinutes(b.startTime);
    return aStart - bStart;
  });

  // Group overlapping events and assign columns
  const columns: ScheduleEvent[][] = [];
  
  overlappingEvents.forEach(event => {
    const eventStart = getTimeInMinutes(event.startTime);
    const eventEnd = getTimeInMinutes(event.endTime);
    
    // Find the first column where this event doesn't overlap with any existing event
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const columnEvents = columns[col];
      const hasOverlap = columnEvents.some(existingEvent => {
        const existingStart = getTimeInMinutes(existingEvent.startTime);
        const existingEnd = getTimeInMinutes(existingEvent.endTime);
        return eventStart < existingEnd && eventEnd > existingStart;
      });
      
      if (!hasOverlap) {
        columns[col].push(event);
        placed = true;
        break;
      }
    }
    
    // If no column found, create a new one
    if (!placed) {
      columns.push([event]);
    }
  });

  // Convert to positioned events
  const positioned: PositionedEvent[] = [];
  const totalColumns = columns.length;
  
  columns.forEach((columnEvents, columnIndex) => {
    columnEvents.forEach(event => {
      // Only include events that start at this specific time slot
      if (event.startHour === timeSlot) {
        positioned.push({
          ...event,
          column: columnIndex,
          totalColumns
        });
      }
    });
  });

  return positioned;
}
