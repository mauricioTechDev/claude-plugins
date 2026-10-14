import type { Register, SessionRateLimit } from 'claude-code'

const NAMES: Record<string, string> = {
  five_hour: '5-hour limit',
  seven_day: 'weekly limit',
  spend_limit: 'spend limit',
}
const SHORT: Record<string, string> = { five_hour: '5h', seven_day: 'wk', spend_limit: 'spend' }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The 5-hour window is always on screen; the others only earn the space once they get close.
const SHOW_OTHERS_AT = 75

const resetLabel = (iso: string | undefined, now: number) => {
  const at = new Date(iso ?? Number.NaN)
  if (Number.isNaN(at.getTime())) return undefined
  const hour = at.getHours()
  const clock = `${hour % 12 || 12}:${String(at.getMinutes()).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
  // A weekly reset days away means nothing without its day.
  return at.getTime() - now > 20 * 3_600_000 ? `${DAYS[at.getDay()]} ${clock}` : clock
}

const statusLine = (windows: readonly SessionRateLimit[], now: number) => {
  const shown = windows
    .filter(w => w.kind === 'five_hour' || w.percentUsed >= SHOW_OTHERS_AT)
    .map(w => {
      const reset = w.kind === 'five_hour' ? resetLabel(w.resetsAt, now) : undefined
      // Floored so the screen never reads 95% while the guard, comparing the exact figure, hasn't fired.
      return `${SHORT[w.kind] ?? w.kind} ${Math.floor(w.percentUsed)}%${reset ? ` · resets ${reset}` : ''}`
    })
  return shown.length > 0 ? shown.join(' · ') : undefined
}

// Outside the project, so a handoff never gets swept into a commit.
const handoffPath = (home: string | undefined, cwd: string) =>
  `${home ?? '~'}/.claude/handoffs/${cwd.replaceAll('/', '-')}.md`

const userNote = (text: string) => ({
  message: { type: 'user' as const, content: [{ type: 'text' as const, text }] },
})

export const register: Register = (on, options) => {
  const threshold = Number(options.threshold) || 95
  const showStatus = options.showStatus !== false
  // One note per window and reset: repeating it at every point would spend the tokens this exists to save.
  const nudged = new Set<string>()
  let isFirstPrompt = true

  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    if (!e.changed.includes('rateLimits')) return measured

    const now = Date.now()
    if (showStatus) $.ui.status(statusLine(e.rateLimits, now))

    const [due] = e.rateLimits
      .filter(w => w.percentUsed >= threshold && !nudged.has(`${w.kind}@${w.resetsAt}`))
      .sort((a, b) => b.percentUsed - a.percentUsed)
    if (!due) return measured
    // A plain `claude -p` run (a script, a bridge server) has nobody to hand off to, and the note would land in its output.
    if ((await $.session.surfaces()).length === 0) return measured
    for (const w of e.rateLimits) if (w.percentUsed >= threshold) nudged.add(`${w.kind}@${w.resetsAt}`)

    const reset = resetLabel(due.resetsAt, now)
    const limit = `${NAMES[due.kind] ?? due.kind} is at ${due.percentUsed}%${reset ? ` (resets ${reset})` : ''}`
    const path = handoffPath(await $.env.get('HOME'), await $.session.cwd())
    await $.session.append(
      userNote(
        `[usage-guard] Your ${limit}. Wrap up now with the usage-guard skill: reach a safe stopping point, save the handoff to ${path}, tell the user, and stop. Start no new work. When the user says to continue, delete that file and carry on.`,
      ),
    )
    $.ui.toast(`Your ${limit}. Claude is wrapping up.`, { timeoutMs: 10_000 })
    await $.ui.notify(`Your ${limit}. Claude is wrapping up.`, { title: 'Claude usage' }).catch(() => undefined)
    return measured
  })

  on('prompt.submit', async ($, e, next) => {
    if (!isFirstPrompt) return next(e)
    isFirstPrompt = false
    if ((await $.session.surfaces()).length === 0) return next(e)

    const path = handoffPath(await $.env.get('HOME'), await $.session.cwd())
    if (!(await $.fs.exists(path))) return next(e)
    // Self-contained on purpose: evals showed loading the skill to resume added turns without changing the outcome.
    const hint = `[usage-guard] A handoff from an earlier session is saved at ${path}. If the user wants to continue that work, read it, check the files still match it, continue from its Next steps, and delete it once the work is picked back up. Otherwise ignore it.`
    return next({ ...e, context: [...(e.context ?? []), hint] })
  })
}
