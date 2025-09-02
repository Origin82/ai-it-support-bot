/**
 * Answer validation rubric and critique functionality
 * Ensures quality and accuracy of IT support responses
 */

export const RUBRIC = `Check Answer JSON for:
1) Schema validity and explicit steps with UI paths/commands.
2) 2–5 citations from ≥2 distinct reputable domains, each with ≤35-word quote.
3) Warnings present for risky steps.
4) Steps' OS labels match actual instructions.
5) Has at least one fallback in decision_tree.
6) No invented menus, vendor names, or registry paths.`;

/**
 * Optional function to critique an answer using the model
 * @param answerJSON The JSON string to critique
 * @returns Promise<string> containing the critique
 */
export async function runRubric(answerJSON: string): Promise<string> {
  try {
    // Import OpenAI client dynamically to avoid SSR issues
    const { OpenAI } = await import('openai');
    
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      return "Rubric critique unavailable: OpenAI API key not configured";
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a quality assurance expert for IT support responses. 
    
${RUBRIC}

Analyze the provided JSON answer and provide a concise critique focusing on:
- Any schema validation issues
- Missing or incorrect citations
- Insufficient warnings for risky operations
- OS label mismatches
- Missing fallback options
- Invented or incorrect technical details

Be specific and constructive. If the answer is excellent, say so briefly.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please critique this IT support answer:\n\n${answerJSON}` }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const critique = response.choices[0]?.message?.content || "No critique generated";
    
    // Log the critique internally (no sensitive data)
    console.log(`[RUBRIC_CRITIQUE] ${new Date().toISOString()}: ${critique.substring(0, 200)}...`);
    
    return critique;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RUBRIC_ERROR] Failed to run rubric critique:', errorMessage);
    
    // Return a safe fallback message
    return `Rubric critique failed: ${errorMessage}. Please check the answer manually using the rubric criteria.`;
  }
}

/**
 * Quick validation helper that checks basic rubric compliance
 * @param answer The parsed Answer object to validate
 * @returns Object with validation results and any issues found
 */
export function quickRubricCheck(answer: unknown): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    // 1) Basic schema validation
    if (!answer || typeof answer !== 'object') {
      issues.push('Answer is not a valid object');
      return { isValid: false, issues, warnings };
    }

    const answerObj = answer as Record<string, unknown>;

    // 2) Check citations
    if (!answerObj.citations || !Array.isArray(answerObj.citations)) {
      issues.push('Missing or invalid citations array');
    } else {
      if (answerObj.citations.length < 2 || answerObj.citations.length > 5) {
        issues.push(`Citations count (${answerObj.citations.length}) must be between 2-5`);
      }
      
      // Check for distinct domains (basic check)
      const domains = answerObj.citations.map((c: unknown) => {
        try {
          const citation = c as { url: string };
          return new URL(citation.url).hostname.replace(/^www\./, '');
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      const uniqueDomains = new Set(domains);
      if (uniqueDomains.size < 2) {
        issues.push(`Citations must be from ≥2 distinct domains (found ${uniqueDomains.size})`);
      }
    }

    // 3) Check warnings for risky steps
    if (!answerObj.warnings || !Array.isArray(answerObj.warnings) || answerObj.warnings.length === 0) {
      warnings.push('No warnings provided - consider adding warnings for risky operations');
    }

    // 4) Check OS labels consistency
    if (answerObj.steps && Array.isArray(answerObj.steps)) {
      answerObj.steps.forEach((step: unknown, index: number) => {
        const stepObj = step as Record<string, unknown>;
        if (stepObj.os && Array.isArray(stepObj.os)) {
          if (stepObj.os.length === 0) {
            issues.push(`Step ${index + 1} has empty OS array`);
          }
        } else {
          issues.push(`Step ${index + 1} missing OS labels`);
        }
      });
    }

    // 5) Check decision tree fallback
    if (!answerObj.decision_tree || !Array.isArray(answerObj.decision_tree) || answerObj.decision_tree.length === 0) {
      warnings.push('No decision tree fallbacks provided');
    }

    // 6) Check for steps array
    if (!answerObj.steps || !Array.isArray(answerObj.steps) || answerObj.steps.length === 0) {
      issues.push('Missing or empty steps array');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    };
  }
}
