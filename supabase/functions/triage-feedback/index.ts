import { createClient } from 'jsr:@supabase/supabase-js@2'

function getRequiredEnvVar(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const MISTRAL_API_KEY = getRequiredEnvVar('MISTRAL_API_KEY')
const GITHUB_TOKEN    = getRequiredEnvVar('GITHUB_TOKEN')
const GITHUB_REPO     = getRequiredEnvVar('GITHUB_REPO')
const SUPABASE_URL    = getRequiredEnvVar('SUPABASE_URL')
const SUPABASE_KEY    = getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY')
const WEBHOOK_SECRET  = getRequiredEnvVar('WEBHOOK_SECRET')

// Label mapping from feedback type to GitHub labels
const TYPE_LABELS: Record<string, string[]> = {
  bug:         ['type:bug', 'agent:triage'],
  improvement: ['type:improvement', 'agent:pm'],
  question:    ['type:question', 'agent:triage'],
  other:       ['type:chore', 'agent:triage'],
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'priority:critical',
  high:     'priority:high',
  medium:   'priority:medium',
  low:      'priority:low',
}

interface FeedbackRow {
  id: string
  type: string
  title: string
  description: string
  email: string | null
  url: string | null
  user_id: string | null
  created_at: string
  github_issue_number: number | null
}

interface TriageResult {
  type: 'bug' | 'improvement' | 'question' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  github_title: string
  github_body: string
  triage_notes: string
}

async function classifyWithMistral(feedback: FeedbackRow): Promise<TriageResult> {
  const prompt = `You are a triage agent for Common Parts Access, a platform for digital spare parts and repair.

Your job is to classify user feedback and write a clean GitHub issue.

## What you must do
- Rewrite the user's description in clear, neutral, third-person language
- Preserve the user's intent faithfully — do not add or remove meaning
- Remove informal language, greetings, filler ("Hi team", "Thank you!", "or something")
- Keep only what the user actually said they need

## What you must NOT do
- Do not suggest solutions, routes, or implementation approaches
- Do not add bullet points or requirements the user did not mention
- Do not infer anything beyond what was explicitly stated
- Do not write "Expected Behavior", "Suggested Solution" or similar sections

## Output format
Return a JSON object with exactly these fields:
- type: one of "bug", "improvement", "question", "other" — use the user's selection unless clearly wrong
- priority: one of "critical", "high", "medium", "low"
  - critical: broken functionality or data loss
  - high: significant friction or missing core feature
  - medium: noticeable but not blocking
  - low: minor or cosmetic
- github_title: a concise issue title (max 80 chars, problem-focused, no solution language)
- github_body: markdown with exactly two sections:
  ## Problem
  (2–4 sentences, neutral third-person rewrite of what the user described — no solutions, no bullet points unless the user wrote them)
  ## Context
  (Page: [url] — Date: [date])
- triage_notes: one sentence explaining your priority decision

## User feedback
Type (user-selected): ${feedback.type}
Title: ${feedback.title}
Description: ${feedback.description}
Page URL: ${feedback.url ?? 'not provided'}
Submitted: ${feedback.created_at}

Return ONLY valid JSON, no markdown fences, no explanation.`

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content.trim()

  // Strip markdown fences if present
  const clean = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(clean) as TriageResult
}

async function createGitHubIssue(triage: TriageResult, feedback: FeedbackRow): Promise<{ number: number; url: string }> {
  const labels = [
    ...(TYPE_LABELS[triage.type] ?? TYPE_LABELS.other),
    PRIORITY_LABEL[triage.priority] ?? 'priority:medium',
  ]

  // Append metadata footer to body
  const body = `${triage.github_body}

---
<details>
<summary>Original user feedback</summary>

**Type:** ${feedback.type}
**Title:** ${feedback.title}

${feedback.description}

</details>

---
**Submitted via Common Parts Access feedback widget**
- Feedback ID: \`${feedback.id}\`
- Page: ${feedback.url ?? 'not provided'}
- User: ${feedback.user_id ? `\`${feedback.user_id}\`` : 'anonymous'}
- Original type: \`${feedback.type}\`
`

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: triage.github_title,
      body,
      labels,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${await response.text()}`)
  }

  const issue = await response.json()
  return { number: issue.number, url: issue.html_url }
}

Deno.serve(async (req) => {
  // Verify the request comes from Supabase webhook
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let feedback: FeedbackRow
  try {
    const payload = await req.json()
    feedback = payload.record as FeedbackRow
  } catch {
    return new Response('Invalid payload', { status: 400 })
  }

  // Idempotency guard: re-fetch the current row to detect retries after partial failures.
  // The webhook payload always reflects the INSERT state (github_issue_number = null),
  // so we must read the live row — not the payload — to know if the issue was already created.
  const { data: currentRow } = await supabase
    .from('feedback')
    .select('github_issue_number')
    .eq('id', feedback.id)
    .single()
  if (currentRow?.github_issue_number) {
    console.log(`Feedback ${feedback.id} already triaged (issue #${currentRow.github_issue_number}), skipping.`)
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`Triaging feedback: ${feedback.id} — "${feedback.title}"`)

  try {
    // 1. Classify with Mistral
    const triage = await classifyWithMistral(feedback)
    console.log(`Classification: type=${triage.type} priority=${triage.priority}`)

    // 2. Create GitHub issue
    const issue = await createGitHubIssue(triage, feedback)
    console.log(`GitHub issue created: #${issue.number} ${issue.url}`)

    // 3. Update feedback row
    const { error } = await supabase
      .from('feedback')
      .update({
        status: 'github_issue_created',
        github_issue_number: issue.number,
        github_issue_url: issue.url,
        triage_notes: triage.triage_notes,
      })
      .eq('id', feedback.id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, issue: issue.url }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Triage failed:', err)

    // Leave status as 'pending' so the row remains recoverable.
    // Only write triage_notes; do not falsely mark as triaged.
    const { error: updateError } = await supabase
      .from('feedback')
      .update({ triage_notes: `Triage error: ${(err as Error).message}` })
      .eq('id', feedback.id)
    if (updateError) console.error('Failed to persist triage error notes:', updateError)

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})