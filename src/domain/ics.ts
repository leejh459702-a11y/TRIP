import { format } from 'date-fns';
import type { TimelineEntry, TravelMode } from './types';
import type { ResolvedBlock } from './timeline';

const MODE_LABEL: Record<TravelMode, string> = { car: '자동차', transit: '대중교통', walk: '도보' };

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function fmt(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

interface DayEntries {
  entries: TimelineEntry[];
  resolved: ResolvedBlock[];
}

/**
 * F5: 코스를 .ics 캘린더 파일로 만듭니다. 블록당 VEVENT 하나, 위치는 좌표+주소,
 * 설명에는 다음 블록까지의 이동수단·소요시간을 담습니다.
 */
export function generateIcs(courseTitle: string, days: readonly DayEntries[], now = new Date()): string {
  const dtstamp = format(now, "yyyyMMdd'T'HHmmss'Z'");
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TripLog//KO', 'CALSCALE:GREGORIAN'];

  for (const { entries, resolved } of days) {
    for (const entry of entries) {
      const resolvedBlock = resolved.find((r) => r.block.id === entry.block.id);
      const place = resolvedBlock?.place;
      const summary =
        entry.block.type === 'free' ? entry.block.label || '자유시간' : (place?.name ?? '일정');

      const descriptionParts: string[] = [];
      if (entry.legToNext) {
        descriptionParts.push(
          `이동수단: ${MODE_LABEL[entry.legToNext.mode]} · 소요 ${entry.legToNext.durationMin}분`,
        );
      }

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${entry.block.id}@triplog`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${fmt(entry.arriveAt)}`);
      lines.push(`DTEND:${fmt(entry.leaveAt)}`);
      lines.push(`SUMMARY:${escapeIcsText(`${courseTitle} · ${summary}`)}`);
      if (place) {
        lines.push(`LOCATION:${escapeIcsText(place.address)}`);
        lines.push(`GEO:${place.lat};${place.lng}`);
      }
      if (descriptionParts.length > 0) {
        lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join(' · '))}`);
      }
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
