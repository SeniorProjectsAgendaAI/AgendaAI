export const PENDING_APPROVAL_STATUS = "pending_approval";

export interface ConflictCheckEvent {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  status?: string | null;
}

const getTime = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const findEventConflicts = (
  events: ConflictCheckEvent[],
  startAt: string,
  endAt: string,
  excludeEventId?: number,
) => {
  const nextStart = getTime(startAt);
  const nextEnd = getTime(endAt);
  if (nextStart === null || nextEnd === null || nextEnd <= nextStart) return [];

  return events.filter((event) => {
    if (event.id === excludeEventId) return false;
    if (event.status === "canceled" || event.status === PENDING_APPROVAL_STATUS) {
      return false;
    }

    const eventStart = getTime(event.startAt);
    const eventEnd = getTime(event.endAt);
    if (eventStart === null || eventEnd === null) return false;

    return eventStart < nextEnd && eventEnd > nextStart;
  });
};

export const formatConflictMessage = (conflicts: ConflictCheckEvent[]) => {
  if (conflicts.length === 0) return "";

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return conflicts
    .map((event) => {
      const start = new Date(event.startAt);
      const end = new Date(event.endAt);
      return `${event.title} (${formatter.format(start)} - ${formatter.format(end)})`;
    })
    .join("\n");
};
