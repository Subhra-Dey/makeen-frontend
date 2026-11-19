// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import {
  NOTIFICATION_EVENT_LABEL,
  NOTIFICATION_MESSAGES,
  customNoticeSchema,
  inboxQuerySchema,
  noticeHref,
  personNoteSchema,
  replySchema,
  sendLogQuerySchema,
} from './notifications';

const ID = '0190a000-0000-7000-8000-000000000001';

function issues(r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));
}

describe('custom notice (NOTIF-S1…S8)', () => {
  const base = { customCategory: 'Safety', title: 'Drill', message: 'This week' };

  it('needs a role, a plant or named people', () => {
    expect(issues(customNoticeSchema.safeParse(base))['roleId']).toBe(
      NOTIFICATION_MESSAGES.targetRequired,
    );
    expect(customNoticeSchema.safeParse({ ...base, roleId: 'ALL' }).success).toBe(true);
    expect(customNoticeSchema.safeParse({ ...base, plantId: ID }).success).toBe(true);
    expect(customNoticeSchema.safeParse({ ...base, userIds: [ID] }).success).toBe(true);
  });

  it('needs a category, a title and a message; buttons default off', () => {
    const r = customNoticeSchema.safeParse({ roleId: 'ALL', title: ' ', message: '' });
    const m = issues(r);
    expect(m['customCategory']).toBe(NOTIFICATION_MESSAGES.categoryRequired);
    expect(m['title']).toBe(NOTIFICATION_MESSAGES.titleRequired);
    expect(m['message']).toBe(NOTIFICATION_MESSAGES.messageRequired);
    expect(customNoticeSchema.parse({ ...base, roleId: 'ALL' })).toMatchObject({
      canAcknowledge: false,
      canReply: false,
      userIds: [],
    });
  });
});

describe('inbox, notes and replies', () => {
  it('filters default to All and are checked', () => {
    expect(inboxQuerySchema.parse({})).toMatchObject({ filter: 'ALL', page: 1, pageSize: 30 });
    expect(inboxQuerySchema.safeParse({ filter: 'EVERYTHING' }).success).toBe(false);
  });

  it('a note needs a person and a message; a reply needs text', () => {
    expect(issues(personNoteSchema.safeParse({ toUserId: ID, message: ' ' }))['message']).toBe(
      NOTIFICATION_MESSAGES.messageRequired,
    );
    expect(replySchema.safeParse({ text: '' }).success).toBe(false);
    expect(replySchema.parse({ text: '  Done  ' }).text).toBe('Done');
  });

  it('the send log filters by real dates', () => {
    expect(sendLogQuerySchema.safeParse({ from: '2026-10-01', to: '2026-10-16' }).success).toBe(
      true,
    );
    expect(sendLogQuerySchema.safeParse({ from: '16-10-2026' }).success).toBe(false);
  });
});

describe('noticeHref (NOTIF-2: the exact row)', () => {
  it('links each kind of row to its page', () => {
    expect(noticeHref('daily_mis', ID)).toBe(`/daily-mis/${ID}`);
    expect(noticeHref('monthly_mis', ID)).toBe('/dashboard');
    expect(noticeHref('daily_exception', ID)).toBe('/dashboard');
    expect(noticeHref('licence', ID)).toBe('/dashboard');
    expect(noticeHref('audit', ID)).toBe('/dashboard');
    expect(noticeHref('plant', ID)).toBe('/dashboard');
    expect(noticeHref('notification', ID)).toBe(`/notifications?open=${ID}`);
    expect(noticeHref('unknown', ID)).toBeNull();
    expect(noticeHref(null, null)).toBeNull();
  });

  it('names all eight events of the spec in order', () => {
    expect(Object.values(NOTIFICATION_EVENT_LABEL).map((l) => l.slice(0, 2))).toEqual([
      '1.',
      '2.',
      '3.',
      '4.',
      '5.',
      '6.',
      '7.',
      '8.',
    ]);
  });
});
