import { createClient } from 'jsr:@supabase/supabase-js@2'

const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')!
const GITHUB_TOKEN    = Deno.env.get('GITHUB_TOKEN')!
const GITHUB_REPO     = Deno.env.get('GITHUB_REPO')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
}

interface TriageResult {
  type: 'bug' | 'improvement' | 'question' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  github_title: string
  github_body: string
  triage_notes: string
}

async function classifyWithMistral(feedback: FeedbackRow): Promise<TriageResult> {
  const prompt = `You are a product triage agent for Common Parts Access, a platform for digital spare parts and repair.

Analyze this user feedback and return a JSON object with exactly these fields:
- type: one of "bug", "improvement", "question", "other"
- priority: one of "critical", "high", "medium", "low"
- github_title: a clear, actionable GitHub issue title (max 80 chars)
- github_body: a well-structured GitHub issue body in markdown (include context, steps to reproduce if bug, expected behavior)
- triage_notes: brief internal note explaining your classification decision (1-2 sentences)

Feedback type (user-selected): ${feedback.type}
Title: ${feedback.title}
Description: ${feedback.description}
Page URL: ${feedback.url ?? 'not provided'}
Submitted: ${feedback.created_at}

Return ONLY valid JSON, no markdown, no explanation.`

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
  if (authHeader !== `Bearer ${Deno.env.get('WEBHOOK_SECRET')}`) {
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

    // Mark as triaged even on error so it's not retried endlessly
    await supabase
      .from('feedback')
      .update({ status: 'triaged', triage_notes: `Triage error: ${(err as Error).message}` })
      .eq('id', feedback.id)

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})