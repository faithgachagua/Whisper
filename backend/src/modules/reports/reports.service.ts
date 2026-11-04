import { db, newId, now } from '../../core/db';
import type { Report, ReportReason, ReportTarget } from '../../core/types';

const URGENT: Array<Report['reason']> = ['self_harm', 'grooming', 'crisis_language'];

export function fileReport(input: { reporterId: string; targetType: ReportTarget; targetId: string; reason: Report['reason']; details?: string }): Report {
  const existing = db.data.reports.find(
    (r) => r.status === 'open' && r.reporterId === input.reporterId && r.targetType === input.targetType && r.targetId === input.targetId,
  );
  if (existing) return existing;
  const report: Report = {
    id: newId(), reporterId: input.reporterId, targetType: input.targetType, targetId: input.targetId, reason: input.reason,
    details: (input.details ?? '').slice(0, 1000), priority: URGENT.includes(input.reason) ? 'urgent' : 'normal', status: 'open', createdAt: now(),
  };
  db.data.reports.push(report);
  db.save();
  return report;
}

/** Automatic flag raised by the safety scanner (e.g. crisis language). */
export const flagForReview = (targetType: ReportTarget, targetId: string, reason: ReportReason | 'crisis_language', details = '') =>
  fileReport({ reporterId: 'system', targetType, targetId, reason, details });
