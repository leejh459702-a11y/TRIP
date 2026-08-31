import type { Place, Visit } from './types';

function escapeCsvCell(value: unknown): string {
  if (value == null) return '';
  const s = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return lines.join('\r\n');
}

/** H3: 저장 장소를 CSV로 내보냅니다. */
export function placesToCsv(places: readonly Place[]): string {
  const header = [
    'id',
    'name',
    'category',
    'lat',
    'lng',
    'address',
    'sido',
    'sigungu',
    'tags',
    'defaultStayMin',
    'estCostPerPerson',
    'visitCount',
    'lastVisitedAt',
    'latestRevisit',
  ];
  const rows = places.map((p) => [
    p.id,
    p.name,
    p.category,
    p.lat,
    p.lng,
    p.address,
    p.region.sido,
    p.region.sigungu,
    p.tags,
    p.defaultStayMin,
    p.estCostPerPerson,
    p.visitCount,
    p.lastVisitedAt,
    p.latestRevisit,
  ]);
  return rowsToCsv(header, rows);
}

/** H3: 방문 기록을 CSV로 내보냅니다. */
export function visitsToCsv(visits: readonly Visit[]): string {
  const header = [
    'id',
    'placeId',
    'courseId',
    'visitedAt',
    'revisit',
    'companions',
    'memo',
    'cost',
    'weekday',
    'timeSlot',
    'season',
    'stayMin',
  ];
  const rows = visits.map((v) => [
    v.id,
    v.placeId,
    v.courseId,
    v.visitedAt,
    v.revisit,
    v.companions,
    v.memo,
    v.cost,
    v.auto.weekday,
    v.auto.timeSlot,
    v.auto.season,
    v.auto.stayMin,
  ]);
  return rowsToCsv(header, rows);
}
