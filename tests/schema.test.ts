import { describe, it, expect } from 'vitest';
import { AnswerSchema, distinctDomainsOK, clampAnswer, type Answer } from '@/lib/answerSchema';

describe('AnswerSchema', () => {
  const validAnswer: Answer = {
    answer_title: 'How to Fix WiFi Issues',
    one_paragraph_summary: 'This guide provides step-by-step instructions to resolve common WiFi connectivity problems on various operating systems.',
    prereqs: ['WiFi adapter', 'Router access'],
    steps: [
      {
        title: 'Check WiFi adapter',
        detail: 'Ensure your WiFi adapter is enabled and working properly',
        os: ['Windows', 'macOS'],
        est_minutes: 5,
        shell: ['netsh wlan show interfaces']
      }
    ],
    decision_tree: [
      {
        if: 'WiFi adapter not found',
        then: 'Install or update WiFi drivers',
        link_step: 2
      }
    ],
    diagrams: [
      {
        caption: 'WiFi troubleshooting flow',
        svg: '<svg width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'
      }
    ],
    citations: [
      {
        url: 'https://example.com/wifi-guide',
        title: 'Official WiFi Troubleshooting Guide',
        quote: 'Common WiFi issues and their solutions'
      },
      {
        url: 'https://support.example.com/network',
        title: 'Network Support Documentation',
        quote: 'Step-by-step network troubleshooting procedures'
      }
    ],
    warnings: ['Backup important data before making changes']
  };

  it('should validate a complete valid answer', () => {
    const result = AnswerSchema.safeParse(validAnswer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validAnswer);
    }
  });

  it('should fail on empty steps array', () => {
    const invalidAnswer = { ...validAnswer, steps: [] };
    const result = AnswerSchema.safeParse(invalidAnswer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('steps'))).toBe(true);
    }
  });

  it('should fail on invalid OS enum', () => {
    const invalidAnswer = {
      ...validAnswer,
      steps: [
        {
          ...validAnswer.steps[0],
          os: ['InvalidOS' as any]
        }
      ]
    };
    const result = AnswerSchema.safeParse(invalidAnswer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('os'))).toBe(true);
    }
  });

  it('should fail on citations less than 2', () => {
    const invalidAnswer = { ...validAnswer, citations: [validAnswer.citations[0]] };
    const result = AnswerSchema.safeParse(invalidAnswer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('citations'))).toBe(true);
    }
  });

  it('should fail on citations more than 5', () => {
    const invalidAnswer = {
      ...validAnswer,
      citations: [
        ...validAnswer.citations,
        ...validAnswer.citations,
        ...validAnswer.citations,
        ...validAnswer.citations
      ]
    };
    const result = AnswerSchema.safeParse(invalidAnswer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('citations'))).toBe(true);
    }
  });

  it('should fail on non-SVG diagrams', () => {
    const invalidAnswer = {
      ...validAnswer,
      diagrams: [
        {
          caption: 'Invalid diagram',
          svg: 'not an svg'
        }
      ]
    };
    const result = AnswerSchema.safeParse(invalidAnswer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('diagrams'))).toBe(true);
    }
  });

  it('should pass on valid SVG diagrams', () => {
    const validAnswerWithSvg = {
      ...validAnswer,
      diagrams: [
        {
          caption: 'Valid SVG',
          svg: '<svg width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>'
        }
      ]
    };
    const result = AnswerSchema.safeParse(validAnswerWithSvg);
    expect(result.success).toBe(true);
  });

  it('should handle missing optional fields with defaults', () => {
    const minimalAnswer = {
      answer_title: 'Minimal Answer',
      one_paragraph_summary: 'A minimal answer',
      steps: [
        {
          title: 'Single step',
          detail: 'Just one step',
          os: ['Windows']
        }
      ],
      citations: [
        {
          url: 'https://example1.com',
          title: 'Source 1',
          quote: 'First source'
        },
        {
          url: 'https://example2.com',
          title: 'Source 2',
          quote: 'Second source'
        }
      ]
    };
    const result = AnswerSchema.safeParse(minimalAnswer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prereqs).toEqual([]);
      expect(result.data.decision_tree).toEqual([]);
      expect(result.data.diagrams).toEqual([]);
      expect(result.data.warnings).toEqual([]);
    }
  });
});

describe('distinctDomainsOK', () => {
  it('should return true for citations from different domains', () => {
    const citations = [
      { url: 'https://example.com/page1', title: 'Page 1', quote: 'Quote 1' },
      { url: 'https://different.com/page2', title: 'Page 2', quote: 'Quote 2' }
    ];
    expect(distinctDomainsOK(citations)).toBe(true);
  });

  it('should return false for citations from same domain', () => {
    const citations = [
      { url: 'https://example.com/page1', title: 'Page 1', quote: 'Quote 1' },
      { url: 'https://example.com/page2', title: 'Page 2', quote: 'Quote 2' }
    ];
    expect(distinctDomainsOK(citations)).toBe(false);
  });

  it('should return false for citations from subdomains of same eTLD+1', () => {
    const citations = [
      { url: 'https://support.microsoft.com/page1', title: 'Page 1', quote: 'Quote 1' },
      { url: 'https://docs.microsoft.com/page2', title: 'Page 2', quote: 'Quote 2' }
    ];
    expect(distinctDomainsOK(citations)).toBe(false);
  });

  it('should return false for less than 2 citations', () => {
    const citations = [
      { url: 'https://example.com/page1', title: 'Page 1', quote: 'Quote 1' }
    ];
    expect(distinctDomainsOK(citations)).toBe(false);
  });

  it('should handle invalid URLs gracefully', () => {
    const citations = [
      { url: 'not-a-url', title: 'Invalid', quote: 'Invalid' },
      { url: 'https://example.com/page2', title: 'Valid', quote: 'Valid' }
    ];
    expect(distinctDomainsOK(citations)).toBe(false);
  });
});

describe('clampAnswer', () => {
  it('should trim long strings to safe lengths', () => {
    const longAnswer: Answer = {
      answer_title: 'A'.repeat(300),
      one_paragraph_summary: 'B'.repeat(1500),
      prereqs: ['C'.repeat(500)],
      steps: [
        {
          title: 'D'.repeat(200),
          detail: 'E'.repeat(1000),
          os: ['Windows'],
          shell: ['F'.repeat(300)]
        }
      ],
      decision_tree: [
        {
          if: 'G'.repeat(300),
          then: 'H'.repeat(400)
        }
      ],
      diagrams: [
        {
          caption: 'I'.repeat(300),
          svg: '<svg>' + 'J'.repeat(15000) + '</svg>'
        }
      ],
      citations: [
        {
          url: 'https://example.com',
          title: 'K'.repeat(300),
          quote: 'L'.repeat(200)
        },
        {
          url: 'https://example2.com',
          title: 'M'.repeat(300),
          quote: 'N'.repeat(200)
        }
      ],
      warnings: ['O'.repeat(500)]
    };

    const clamped = clampAnswer(longAnswer);
    
    expect(clamped.answer_title.length).toBeLessThanOrEqual(200);
    expect(clamped.one_paragraph_summary.length).toBeLessThanOrEqual(1000);
    expect(clamped.prereqs[0].length).toBeLessThanOrEqual(300);
    expect(clamped.steps[0].title.length).toBeLessThanOrEqual(150);
    expect(clamped.steps[0].detail.length).toBeLessThanOrEqual(800);
    expect(clamped.steps[0].shell![0].length).toBeLessThanOrEqual(200);
    expect(clamped.decision_tree[0].if.length).toBeLessThanOrEqual(200);
    expect(clamped.decision_tree[0].then.length).toBeLessThanOrEqual(300);
    expect(clamped.diagrams[0].caption.length).toBeLessThanOrEqual(200);
    expect(clamped.diagrams[0].svg.length).toBeLessThanOrEqual(10000);
    expect(clamped.citations[0].title.length).toBeLessThanOrEqual(200);
    expect(clamped.citations[0].quote.length).toBeLessThanOrEqual(180);
    expect(clamped.warnings[0].length).toBeLessThanOrEqual(300);
  });

  it('should preserve short strings unchanged', () => {
    const shortAnswer: Answer = {
      answer_title: 'Short Title',
      one_paragraph_summary: 'Short summary',
      prereqs: ['Short prereq'],
      steps: [
        {
          title: 'Short step',
          detail: 'Short detail',
          os: ['Windows']
        }
      ],
      decision_tree: [
        {
          if: 'Short if',
          then: 'Short then'
        }
      ],
      diagrams: [
        {
          caption: 'Short caption',
          svg: '<svg><rect width="10" height="10"/></svg>'
        }
      ],
      citations: [
        {
          url: 'https://example.com',
          title: 'Short title',
          quote: 'Short quote'
        },
        {
          url: 'https://example2.com',
          title: 'Short title 2',
          quote: 'Short quote 2'
        }
      ],
      warnings: ['Short warning']
    };

    const clamped = clampAnswer(shortAnswer);
    expect(clamped).toEqual(shortAnswer);
  });
});
