const EMPTY_DRAFT = {
  dev: null,
  test: null,
  dep: null,
  by: '',
  clinic: '',
  cred: null,
  lead: '',
  inf: null,
  notes: '',
  deadline: null,
  priority: null,
}

const DATE_PATTERN = [
  '\\d{4}-\\d{2}-\\d{2}',
  '\\d{1,2}\\/\\d{1,2}\\/\\d{4}',
  '\\d{1,2}\\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\\s+\\d{4})?',
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:,?\\s+\\d{4})?',
  'today|tomorrow|next\\s+week|next\\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|in\\s+\\d+\\s+(?:days?|weeks?)|end\\s+of\\s+month',
].join('|')

function toLocalDate(value = new Date()) {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function validDate(year, month, day) {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}

function resolveDeadline(value, today) {
  const text = value.trim().replace(/,$/, '').replace(/\.$/, '')
  const current = toLocalDate(today)
  const lower = text.toLowerCase()
  const addDays = (days) => {
    const result = new Date(current)
    result.setDate(result.getDate() + days)
    return result
  }

  if (lower === 'today') return formatDate(current)
  if (lower === 'tomorrow') return formatDate(addDays(1))
  if (lower === 'next week') return formatDate(addDays(7))
  if (lower === 'end of month') return formatDate(new Date(current.getFullYear(), current.getMonth() + 1, 0))
  const relative = /^in\s+(\d+)\s+(days?|weeks?)$/i.exec(lower)
  if (relative) return formatDate(addDays(Number(relative[1]) * (relative[2].startsWith('week') ? 7 : 1)))
  const weekday = /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.exec(lower)
  if (weekday) {
    const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const target = names.indexOf(weekday[1].toLowerCase())
    return formatDate(addDays(((target - current.getDay() + 7) % 7) || 7))
  }

  let year
  let month
  let day
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  if (match) {
    year = Number(match[1])
    month = Number(match[2])
    day = Number(match[3])
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text))) {
    day = Number(match[1])
    month = Number(match[2])
    year = Number(match[3])
  } else {
    match = /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/.exec(text)
      || /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(text)
    if (!match) return null
    const dayFirst = /^\d/.test(match[1])
    const dayText = dayFirst ? match[1] : match[2]
    const monthText = dayFirst ? match[2] : match[1]
    const yearText = match[3]
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    month = monthNames.findIndex((name) => name === monthText.slice(0, 3).toLowerCase()) + 1
    day = Number(dayText)
    year = yearText ? Number(yearText) : current.getFullYear()
  }

  let date = validDate(year, month, day)
  if (!date) return null
  const explicitYear = /\b\d{4}\b/.test(text)
  if (!explicitYear) {
    const daysPast = (Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
      - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000
    if (daysPast > 60) date = validDate(year + 1, month, day)
  }
  return date ? formatDate(date) : null
}

function capture(text, expression, transform = (match) => match[1]) {
  const match = expression.exec(text)
  return match ? transform(match) : ''
}

function detectedFields(line, today) {
  const values = {}
  const deadlineExpression = new RegExp(
    `\\b(?:needed\\s+by|deadline(?:\\s+is|\\s*:)?|due(?:\\s+by)?|before|until|by)\\s+(${DATE_PATTERN})`,
    'i',
  )
  const deadlineMatch = deadlineExpression.exec(line)
  if (deadlineMatch) {
    const deadline = resolveDeadline(deadlineMatch[1], today)
    if (deadline) values.deadline = deadline
  }

  const doctor = capture(line, /\b((?:Dr\.?|Doctor)\s+[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)?)/i)
    || capture(line, /\b(?:requested|asked)\s+by\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)?)/i)
  if (doctor) values.by = doctor.replace(/\s+(?:from|at)$/i, '')

  const clinic = capture(line, /\bfrom\s+([^,.]+?\b(?:Clinic|Hospital|Centre|Center|Care))\b/i)
    || capture(line, /\bat\s+([^,.]+?\b(?:Clinic|Hospital|Centre|Center|Care))\b/i)
    || capture(line, /\bat\s+([^,.]+?)(?=\s+(?:lead|requested|asked|needed|deadline|due|urgent|asap|high\s+priority|critical|in\s+testing|QA|failed|passed|in\s+progress|in\s+review|blocked|stuck|staging|production|doctor\s+informed|not\s+informed)\b|[,.]|$)/i)
  if (clinic) values.clinic = clinic.trim()

  const priority = /\b(?:urgent|asap|high\s+priority|critical|top\s+priority)\b/i.test(line)
  if (priority) values.priority = 'High'

  if (/\b(?:production|prod|live)\b/i.test(line)) values.dep = 'Production'
  else if (/\b(?:staging|stage)\b/i.test(line)) values.dep = 'Staging'

  if (/\b(?:not\s+informed)\b/i.test(line)) values.inf = 'Not Informed'
  else if (/\b(?:doctor\s+informed|told\s+the\s+doctor)\b/i.test(line)) values.inf = 'Informed'

  if (/\bcredentials?\s+pending\b/i.test(line)) values.cred = 'Pending'
  else if (/\bcredentials?\s+(?:sent|given)\b/i.test(line)) values.cred = 'Yes'

  if (/\bfailed\b/i.test(line)) values.test = 'Failed'
  else if (/\b(?:in\s+testing|QA)\b/i.test(line)) values.test = 'In Testing'
  else if (/\b(?:passed|tested\s+ok)\b/i.test(line)) values.test = 'Passed'

  if (/\b(?:in\s+progress|working\s+on)\b/i.test(line)) values.dev = 'In Progress'
  else if (/\b(?:in\s+review|PR)\b/i.test(line)) values.dev = 'In Review'
  else if (/\b(?:done|finished|completed)\b/i.test(line)) values.dev = 'Done'
  else if (/\b(?:blocked|stuck)\b/i.test(line)) values.dev = 'Blocked'
  else if (/\b(?:not\s+started|todo)\b/i.test(line)) values.dev = 'Not Started'

  const lead = capture(line, /\blead(?:\s+is|\s*:)\s*([^,.]+?)(?=\s+(?:and|in|on|at|from|by|due|needed)\b|[,.]|$)/i)
  if (lead) values.lead = lead.trim()

  const cueExpressions = [
    /\b(?:Dr\.?|Doctor)\s+/i, /\b(?:requested|asked)\s+by\b/i,
    /\b(?:needed\s+by|deadline|due(?:\s+by)?|before|until|by)\b/i,
    /\b(?:urgent|asap|high\s+priority|critical|top\s+priority)\b/i,
    /\b(?:staging|stage|production|prod|live)\b/i,
    /\b(?:in\s+testing|QA|failed|passed|tested\s+ok)\b/i,
    /\b(?:in\s+progress|working\s+on|in\s+review|PR|done|finished|completed|blocked|stuck|not\s+started|todo)\b/i,
    /\b(?:doctor\s+informed|told\s+the\s+doctor|not\s+informed|credentials?\s+(?:pending|sent|given)|lead(?:\s+is|\s*:))\b/i,
    /\b(?:from|at)\s+[^,.]+?\b(?:Clinic|Hospital|Centre|Center|Care)\b/i,
  ]
  const firstCue = cueExpressions
    .map((expression) => expression.exec(line))
    .filter(Boolean)
    .reduce((first, match) => Math.min(first, match.index), line.length)
  const name = line.slice(0, firstCue)
    .replace(/^[\s,.:;]*(?:(?:please|add|create|build|implement|we need|i need|feature)\s+)+/i, '')
    .replace(/[\s,.:;]+$/, '')
    .trim()
  if (name) values.name = name
  return values
}

export function parseEntry(text, today = new Date()) {
  const line = String(text ?? '').trim()
  const foundValues = detectedFields(line, today)
  const draft = { name: '', ...EMPTY_DRAFT, ...foundValues }
  const fields = ['name', 'by', 'clinic', 'deadline', 'priority', 'dev', 'test', 'dep', 'inf', 'cred', 'lead', 'notes']
  const found = fields.filter((field) => Object.hasOwn(foundValues, field))
  return { draft, found, missing: fields.filter((field) => !found.includes(field)) }
}
