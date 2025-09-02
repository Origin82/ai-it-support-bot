import OpenAI from 'openai';
import { 
  search_web, 
  fetch_page, 
  make_svg_diagram
} from './tools';
import { 
  AnswerSchema, 
  Answer, 
  distinctDomainsOK, 
  clampAnswer,
  validateAnswer,
  safeParseAnswer 
} from './answerSchema';

// Tool schemas for OpenAI function calling
const toolSchemas = [
  {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description: 'Search the web for relevant information about the IT issue',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string'
          },
          topK: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'fetch_page',
      description: 'Fetch and parse webpage content to extract relevant information',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL of the webpage to fetch'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'make_svg_diagram',
      description: 'Generate an SVG diagram to illustrate the IT support flow or process',
      parameters: {
        type: 'object',
        properties: {
          spec: {
            type: 'string',
            description: 'Text specification for the diagram (e.g., "User PC -> Wi-Fi Router -> ISP Modem")'
          }
        },
        required: ['spec']
      }
    }
  }
];

// Tool function mapping
const toolFunctions = {
  search_web,
  fetch_page,
  make_svg_diagram
};

// System prompt for the IT support expert
const SYSTEM_PROMPT = `You are a Level-1 IT support expert. Ask at most one clarifying question ONLY if OS/device is essential.

Use tools to SEARCH/FETCH multiple reputable sources before answering.
Prefer vendor docs. Return ONLY valid JSON per schema.
Include 2–5 citations with short quotes (MAXIMUM 180 characters each). If sources conflict, pick safest and note in warnings.

IMPORTANT: You must return ONLY valid JSON. Do not include any text before or after the JSON.
Do not use markdown formatting. Return pure JSON that can be parsed directly.

CRITICAL: All citation quotes must be 180 characters or less. Keep quotes brief and relevant.

You must return a valid JSON response with this exact structure:
{
  "answer_title": "Brief, descriptive title",
  "one_paragraph_summary": "Concise summary of the solution",
  "prereqs": ["List of prerequisites"],
  "steps": [
    {
      "title": "Step title",
      "detail": "Detailed step description",
      "os": ["Windows", "macOS", "Linux", "Android", "iOS", "ChromeOS"],
      "est_minutes": 5,
      "shell": ["Optional shell commands"]
    }
  ],
  "decision_tree": [
    {
      "if": "Condition description",
      "then": "Action to take",
      "link_step": 1
    }
  ],
  "diagrams": [
    {
      "caption": "Diagram description",
      "svg": "SVG content starting with <svg"
    }
  ],
  "citations": [
    {
      "url": "https://example.com",
      "title": "Source title",
      "quote": "Brief quote (max 180 chars)"
    }
  ],
  "warnings": ["Important warnings or notes"]
}

Remember: Return ONLY the JSON object, no other text or formatting.`;

/**
 * Main function to answer IT support issues using LLM and tools
 * @param issue Description of the IT issue
 * @param os Operating system (optional)
 * @param device Device type (optional)
 * @returns Validated Answer object
 */
export async function answerIssue({ 
  issue, 
  os, 
  device 
}: { 
  issue: string; 
  os?: string; 
  device?: string; 
}): Promise<Answer> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Construct user message
    let userMessage = `Please help me resolve this IT issue: ${issue}`;
    if (os) userMessage += `\nOperating System: ${os}`;
    if (device) userMessage += `\nDevice Type: ${device}`;
    
    // If OS/device is missing and might be essential, ask for clarification
    if (!os || !device) {
      userMessage += `\n\nNote: If OS or device type is essential for this issue, please ask ONE clarifying question.`;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ];

    let finalResponse = '';
    let toolCallCount = 0;
    const maxToolCalls = 3;

    // Tool calling loop (max 3 rounds)
    while (toolCallCount < maxToolCalls) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo as gpt-4o may not be available
        messages,
        tools: toolSchemas,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 4000,
      });

      const assistantMessage = completion.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error('No response from OpenAI');
      }

      // Add assistant message to conversation
      messages.push(assistantMessage);

      // Check if we have a final answer (no tool calls)
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalResponse = assistantMessage.content || '';
        break;
      }

      // Process tool calls
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type === 'function' && toolCall.function) {
          const { name, arguments: args } = toolCall.function;
          
          try {
            const parsedArgs = JSON.parse(args);
            const toolFunction = toolFunctions[name as keyof typeof toolFunctions];
            
            if (toolFunction) {
              let result;
              
              // Execute tool function
              if (name === 'search_web') {
                result = await toolFunction(parsedArgs.query, parsedArgs.topK);
              } else if (name === 'fetch_page') {
                result = await toolFunction(parsedArgs.url);
              } else if (name === 'make_svg_diagram') {
                result = toolFunction(parsedArgs.spec);
              } else {
                throw new Error(`Unknown tool: ${name}`);
              }

              // Add tool result to conversation
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });
            }
          } catch (error) {
            console.error(`Tool execution error for ${name}:`, error);
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: `Failed to execute ${name}` }),
            });
          }
        }
      }

      // Add tool results to conversation
      messages.push(...toolResults);
      toolCallCount++;
    }

    if (!finalResponse) {
      throw new Error('Failed to get final response after tool calls');
    }

    // Parse and validate the response
    let parsedResponse: Answer;
    
    try {
      // Try multiple JSON extraction strategies
      let jsonStr = '';
      
      // Strategy 1: Look for JSON code blocks
      const jsonBlockMatch = finalResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      } else {
        // Strategy 2: Look for JSON object boundaries
        const jsonObjectMatch = finalResponse.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        } else {
          // Strategy 3: Look for array boundaries
          const jsonArrayMatch = finalResponse.match(/\[[\s\S]*\]/);
          if (jsonArrayMatch) {
            jsonStr = jsonArrayMatch[0];
          }
        }
      }
      
      if (!jsonStr) {
        throw new Error('No valid JSON structure found in response');
      }
      
      // Clean up the JSON string
      jsonStr = jsonStr
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .replace(/\n\s*/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      try {
        parsedResponse = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Attempted to parse:', jsonStr);
        
        // Try to fix common JSON issues
        const fixedJson = jsonStr
          .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
        
        try {
          parsedResponse = JSON.parse(fixedJson);
        } catch (secondError) {
          console.error('Second JSON parse attempt failed:', secondError);
          throw new Error('Unable to parse AI response as valid JSON');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', finalResponse);
      throw new Error('Invalid response format from AI model - unable to extract valid JSON');
    }

    // Clamp answer to safe sizes BEFORE validation
    parsedResponse = clampAnswer(parsedResponse);
    
    // Validate with Zod schema
    const validationResult = safeParseAnswer(parsedResponse);
    if (!validationResult.success) {
      console.error('Schema validation failed:', validationResult.error);
      throw new Error('Response does not match required schema');
    }

    parsedResponse = validationResult.data;

    // Check if citations come from distinct domains
    if (!distinctDomainsOK(parsedResponse.citations)) {
      console.warn('Citations not from distinct domains, requesting addendum');
      
      // Ask model for citation addendum (no tools)
      const addendumMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant. Provide ONLY a JSON array of 1-2 additional citations from different domains to replace or augment the existing ones. Each citation must have url, title, and quote (max 180 chars).' },
        { role: 'user', content: `The current citations are not from distinct domains. Please provide additional citations from different domains to ensure we have at least 2 unique eTLD+1 sources. Current citations: ${JSON.stringify(parsedResponse.citations)}` }
      ];

      const addendumCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: addendumMessages,
        temperature: 0.1,
        max_tokens: 500,
      });

      const addendumContent = addendumCompletion.choices[0]?.message?.content;
      if (addendumContent) {
        try {
          const addendumMatch = addendumContent.match(/\[[\s\S]*\]/);
          if (addendumMatch) {
            const additionalCitations = JSON.parse(addendumMatch[0]);
            if (Array.isArray(additionalCitations)) {
              // Replace some existing citations with new ones
              const newCitations = [
                ...parsedResponse.citations.slice(0, 2),
                ...additionalCitations.slice(0, 3)
              ].slice(0, 5); // Ensure max 5 citations
              
              parsedResponse.citations = newCitations;
              
              // Re-validate
              const revalidationResult = safeParseAnswer(parsedResponse);
              if (!revalidationResult.success) {
                console.warn('Revalidation failed after citation addendum');
              } else {
                parsedResponse = revalidationResult.data;
              }
            }
          }
        } catch (addendumError) {
          console.warn('Failed to parse citation addendum:', addendumError);
        }
      }
    }

    // Final validation
    return validateAnswer(parsedResponse);

  } catch (error) {
    console.error('LLM error:', error);
    
    if (error instanceof Error) {
      // Return user-safe error message
      throw new Error(`Unable to process your request: ${error.message}`);
    } else {
      throw new Error('An unexpected error occurred while processing your request');
    }
  }
}

// Export types for external use
export type { Answer };
export { AnswerSchema, validateAnswer, safeParseAnswer };
