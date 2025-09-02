import { z } from 'zod';

// Step schema with OS array and optional fields
const StepSchema = z.object({
  title: z.string().min(1, 'Step title is required'),
  detail: z.string().min(1, 'Step detail is required'),
  os: z.array(z.enum(['Windows', 'macOS', 'Android', 'iOS', 'ChromeOS', 'Linux'])).min(1, 'At least one OS must be specified'),
  est_minutes: z.number().positive().optional(),
  shell: z.array(z.string()).optional(),
});

// Decision tree schema
const DecisionTreeSchema = z.object({
  if: z.string().min(1, 'Decision condition is required'),
  then: z.string().min(1, 'Decision action is required'),
  link_step: z.number().int().positive().optional(),
});

// Diagram schema with SVG validation
const DiagramSchema = z.object({
  caption: z.string().min(1, 'Diagram caption is required'),
  svg: z.string().min(1, 'SVG content is required').refine(
    (svg) => svg.trim().startsWith('<svg'),
    'SVG must start with <svg tag'
  ),
});

// Citation schema with URL and quote validation
const CitationSchema = z.object({
  url: z.string().url('Valid URL is required'),
  title: z.string().min(1, 'Citation title is required'),
  quote: z.string().max(180, 'Quote must be 180 characters or less'),
});

// Main answer schema
export const AnswerSchema = z.object({
  answer_title: z.string().min(1, 'Answer title is required'),
  one_paragraph_summary: z.string().min(1, 'Summary is required'),
  prereqs: z.array(z.string()).default([]),
  steps: z.array(StepSchema).min(1, 'At least one step is required'),
  decision_tree: z.array(DecisionTreeSchema).default([]),
  diagrams: z.array(DiagramSchema).default([]),
  citations: z.array(CitationSchema).min(2, 'At least 2 citations required').max(5, 'Maximum 5 citations allowed'),
  warnings: z.array(z.string()).default([]),
});

// Export the type
export type Answer = z.infer<typeof AnswerSchema>;

/**
 * Checks if citations come from at least 2 distinct eTLD+1 domains
 * @param citations Array of citation objects
 * @returns true if citations come from >=2 unique eTLD+1 domains
 */
export function distinctDomainsOK(citations: z.infer<typeof CitationSchema>[]): boolean {
  if (citations.length < 2) return false;
  
  const domains = new Set<string>();
  
  for (const citation of citations) {
    try {
      const url = new URL(citation.url);
      const hostname = url.hostname.toLowerCase();
      
      // Extract eTLD+1 (e.g., "example.com" from "sub.example.com")
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const eTLD1 = parts.slice(-2).join('.');
        domains.add(eTLD1);
      } else {
        domains.add(hostname);
      }
    } catch {
      // Invalid URL, skip
      continue;
    }
  }
  
  return domains.size >= 2;
}

/**
 * Clamps answer data to safe sizes and trims long strings
 * @param answer The answer object to clamp
 * @returns Clamped answer with safe string lengths
 */
export function clampAnswer(a: Answer): Answer {
  return {
    ...a,
    answer_title: a.answer_title.substring(0, 200),
    one_paragraph_summary: a.one_paragraph_summary.substring(0, 1000),
    prereqs: a.prereqs.map(p => p.substring(0, 300)),
    steps: a.steps.map(step => ({
      ...step,
      title: step.title.substring(0, 150),
      detail: step.detail.substring(0, 800),
      shell: step.shell?.map(s => s.substring(0, 200)),
    })),
    decision_tree: a.decision_tree.map(dt => ({
      ...dt,
      if: dt.if.substring(0, 200),
      then: dt.then.substring(0, 300),
    })),
    diagrams: a.diagrams.map(d => ({
      ...d,
      caption: d.caption.substring(0, 200),
      svg: d.svg.substring(0, 10000), // SVG can be longer but cap it
    })),
    citations: a.citations.map(c => ({
      ...c,
      title: c.title.substring(0, 200),
      quote: c.quote.substring(0, 180), // Already enforced by schema
    })),
    warnings: a.warnings.map(w => w.substring(0, 300)),
  };
}

// Validation helpers
export const validateAnswer = (data: unknown): Answer => {
  return AnswerSchema.parse(data);
};

export const safeParseAnswer = (data: unknown): { success: true; data: Answer } | { success: false; error: z.ZodError } => {
  const result = AnswerSchema.safeParse(data);
  return result;
};
