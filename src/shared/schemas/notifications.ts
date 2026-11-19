// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { NOTIFICATION_CATEGORIES, type NotificationEvent } from '../enums';
import { isIsoDate } from '../ist';
import { FIELD_MESSAGES } from './field-values';

export const NOTIFICATION_MESSAGES = {
  replyRequired: 'Write a reply before sending.',
  messageRequired: 'Enter message',
  titleRequired: 'Enter title',
  personRequired: 'Choose the person to write to.',
  targetRequired: 'Choose a role, a plant or named people.',
  categoryRequired: 'Choose a category.',
  noRecipients: 'Nobody matches this role / plant / people choice.',
  notFound: 'Notice not found.',
  cannotAcknowledge: 'This notice has no Acknowledge button.',
  cannotReply: 'This notice cannot be replied to.',
  selfNote: 'You cannot send a note to yourself.',
  eventLocked: 'The password OTP is always sent — it cannot be switched off.',
} as const;

/** The eight events of the spec (“The user cycle — events”), in order. */
export const NOTIFICATION_EVENT_LABEL: Readonly<Record<NotificationEvent, string>> = {
  REPORT_SUBMITTED: '1. Daily MIS or Daily Exception submitted',
  EXCEPTION_RAISED: '2. Daily Exception has a Yes line or an incident',
  REPORT_DECIDED: '3. A day or month Approved or Returned',
  LICENCE_DUE: '4. Licence Due or Expired',
  AUDIT_OVERDUE: '5. Audit observation past its target date',
  ACCESS_CHANGED: '6. Plant or access assigned or turned off',
  PASSWORD_OTP: '7. Password OTP',
  PERSON_NOTE: '8. A written note from one person to another',
};

/** “Who receives” column of Notification control (NOTIF-C1). */
export const NOTIFICATION_EVENT_RECEIVERS: Readonly<Record<NotificationEvent, string>> = {
  REPORT_SUBMITTED: 'Plant Manager of the plant',
  EXCEPTION_RAISED: 'Plant Manager of the plant',
  REPORT_DECIDED: 'The person who entered it',
  LICENCE_DUE: 'Remind list on the licence',
  AUDIT_OVERDUE: 'Plant Manager of the plant',
  ACCESS_CHANGED: 'That person and the Plant Manager',
  PASSWORD_OTP: 'The person (KEKA mobile or email, as chosen)',
  PERSON_NOTE: 'The named person',
};

/** Custom notice categories (NOTIF-S1). */
export const CUSTOM_CATEGORIES = [
  'Safety',
  'Operations',
  'Maintenance',
  'Quality',
  'HR',
  'General',
] as const;
export type CustomCategory = (typeof CUSTOM_CATEGORIES)[number];

/** Inbox filters (NOTIF-5, NOTIF-6). */
export const INBOX_FILTERS = ['ALL', 'UNREAD', 'TO_ACKNOWLEDGE', 'REPLIES', 'CUSTOM'] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const inboxQuerySchema = z.object({
  filter: z.enum(INBOX_FILTERS).default('ALL'),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export type InboxQuery = z.infer<typeof inboxQuerySchema>;

const text = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, message).max(max, FIELD_MESSAGES.tooLong(max));

export const replySchema = z.object({ text: text(2000, NOTIFICATION_MESSAGES.replyRequired) });

/** A written note to a named person (event 8). */
export const personNoteSchema = z.object({
  toUserId: z.uuid({ error: NOTIFICATION_MESSAGES.personRequired }),
  message: text(2000, NOTIFICATION_MESSAGES.messageRequired),
});
export type PersonNoteInput = z.infer<typeof personNoteSchema>;

export const peopleSearchSchema = z.object({ q: z.string().trim().max(60).default('') });

export const eventConfigSchema = z.object({ enabled: z.boolean(), emailEnabled: z.boolean() });

/** `ALL` = “All roles” / “All plants”; absent = not chosen. */
const target = z
  .union([z.literal('ALL'), z.uuid()])
  .nullable()
  .optional();

/** Send custom notification (NOTIF-S1…S8). Read is always possible; Acknowledge / Reply optional. */
export const customNoticeSchema = z
  .object({
    customCategory: z.enum(CUSTOM_CATEGORIES, { error: NOTIFICATION_MESSAGES.categoryRequired }),
    roleId: target,
    plantId: target,
    userIds: z.array(z.uuid()).max(500).default([]),
    title: text(200, NOTIFICATION_MESSAGES.titleRequired),
    message: text(5000, NOTIFICATION_MESSAGES.messageRequired),
    canAcknowledge: z.boolean().default(false),
    canReply: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!v.roleId && !v.plantId && v.userIds.length === 0)
      ctx.addIssue({
        code: 'custom',
        path: ['roleId'],
        message: NOTIFICATION_MESSAGES.targetRequired,
      });
  });
export type CustomNoticeInput = z.infer<typeof customNoticeSchema>;

const isoDate = z
  .string()
  .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid)
  .optional();

/** Last sends log filters (NOTIF-C3): category and date range. */
export const sendLogQuerySchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
  from: isoDate,
  to: isoDate,
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type SendLogQuery = z.infer<typeof sendLogQuerySchema>;

/** Where a notice opens (NOTIF-2): the exact row it refers to. */
export function noticeHref(entity: string | null, id: string | null): string | null {
  if (!entity || !id) return null;
  switch (entity) {
    case 'daily_mis':
      return `/daily-mis/${id}`;
    case 'monthly_mis':
    case 'daily_exception':
    case 'licence':
    case 'audit':
    case 'plant':
      return '/dashboard';
    case 'notification':
      return `/notifications?open=${id}`;
    default:
      return null;
  }
}
