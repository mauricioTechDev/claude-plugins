import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import type { On, RenderSurface, SessionAppendInput, SessionRateLimit } from 'claude-code'

type Engine = Parameters<TestBody>[0]

const HANDOFF = '/Users/me/.claude/handoffs/-Users-me-proj.md'

const world = (on: On, { surfaces = ['desktop'], hasHandoff = false }: { surfaces?: readonly RenderSurface[]; hasHandoff?: boolean } = {}) => {
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  mock.env(on, { HOME: '/Users/me' })
  on('session.cwd', () => ({ value: '/Users/me/proj' }))
  on('session.surfaces', () => ({ value: surfaces }))
  on('fs.exists', ($, e) => ({ value: hasHandoff && e.path === HANDOFF }))
  on('ui.status', ($, e) => (statuses.push(e.text), { value: undefined }))
  on('ui.toast', ($, e) => (toasts.push(e.text), { value: undefined }))
  on('ui.notify', () => ({ value: { isSent: false as const, reason: 'no-channel' as const } }))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  return { statuses, toasts, session: mock.session(on) }
}

const fiveHour = (percentUsed: number, resetsAt = '2026-10-14T13:10:00.000Z'): SessionRateLimit => ({ kind: 'five_hour', percentUsed, resetsAt })

const measure = ($: Engine, ...rateLimits: SessionRateLimit[]) =>
  $.session.measure({ context: { window: 200_000 }, rateLimits, changed: ['rateLimits'] })

const submit = ($: Engine, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })

const notes = (rows: readonly SessionAppendInput[]) =>
  rows.map(r => r.message.content.map(b => (b.type === 'text' ? b.text : '')).join(''))

test('shows the 5-hour figure and stays quiet below the threshold', async ($, on) => {
  const w = world(on)
  await measure($, fiveHour(42.7))
  expect(w.statuses.at(-1)).toMatch(/^5h 42% · resets \d{1,2}:\d{2} [AP]M$/)
  expect(w.session.appended()).toHaveLength(0)
})

test('posts one wrap-up note when the 5-hour window crosses the threshold', async ($, on) => {
  const w = world(on)
  await measure($, fiveHour(95.2))
  await measure($, fiveHour(97))
  const [note, ...rest] = notes(w.session.appended())
  expect(rest).toHaveLength(0)
  expect(note).toContain('5-hour limit is at 95.2%')
  expect(note).toContain('usage-guard skill')
  expect(note).toContain(HANDOFF)
  expect(w.toasts).toHaveLength(1)
})

test('warns again once the window has reset and filled up again', async ($, on) => {
  const w = world(on)
  await measure($, fiveHour(96))
  await measure($, fiveHour(96, '2026-10-14T18:10:00.000Z'))
  expect(w.session.appended()).toHaveLength(2)
})

test('leaves headless runs alone', async ($, on) => {
  const w = world(on, { surfaces: [] })
  await measure($, fiveHour(99))
  expect(w.session.appended()).toHaveLength(0)
  expect(w.toasts).toHaveLength(0)
})

test('honours a custom threshold', { options: { threshold: 80 } }, async ($, on) => {
  const w = world(on)
  await measure($, fiveHour(79.9))
  expect(w.session.appended()).toHaveLength(0)
  await measure($, fiveHour(81))
  expect(w.session.appended()).toHaveLength(1)
})

test('watches the weekly window too', async ($, on) => {
  const w = world(on)
  await measure($, fiveHour(40), { kind: 'seven_day', percentUsed: 96, resetsAt: '2026-10-19T02:00:00.000Z' })
  expect(notes(w.session.appended())[0]).toContain('weekly limit is at 96%')
  expect(w.statuses.at(-1)).toContain('· wk 96%')
})

test('points the first prompt at a saved handoff, once', async ($, on) => {
  world(on, { hasHandoff: true })
  const first = await submit($, 'hi')
  expect(first.context?.join('\n')).toContain(HANDOFF)
  const second = await submit($, 'and then?')
  expect(second.context).toBeUndefined()
})

test('says nothing about a handoff that does not exist', async ($, on) => {
  world(on)
  const first = await submit($, 'hi')
  expect(first.context).toBeUndefined()
})
