# IT Support Bot

A Next.js application that provides intelligent IT support solutions using OpenAI's API with structured responses and tool integration.

## Features

- **AI-Powered IT Support**: Get step-by-step solutions for technical issues
- **Multi-Platform Support**: Works with Windows, macOS, Android, iOS, ChromeOS, and Linux
- **Structured Responses**: JSON schema-based answers with prerequisites, steps, decision trees, and warnings
- **Tool Integration**: Built-in tools for web search, page fetching, and diagram generation
- **Rate Limiting**: Built-in protection against API abuse
- **Responsive UI**: Modern, mobile-friendly interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-3.5-turbo with function calling
- **Search**: Brave Search API
- **Validation**: Zod schema validation
- **Testing**: Vitest, React Testing Library
- **Rate Limiting**: Custom token bucket implementation

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Brave Search API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd it-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
touch .env.local
```

4. Add your API keys to `.env.local`:
```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Brave Search API Key (required)
BRAVE_API_KEY=your_brave_search_api_key_here
```

## API Key Setup

### OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add it to your `.env.local` file

### Brave Search API Key

1. Visit [Brave Search API](https://api.search.brave.com/app)
2. Sign in or create a Brave account
3. Subscribe to the Brave Search API (free tier available)
4. Copy your API key
5. Add it to your `.env.local` file

**Note**: The Brave Search API key is required for web search functionality. Without it, the system will fall back to mock results.

## Development

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Navigate to `/it-support` to use the IT support interface

## Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### POST /api/answer

Accepts IT support queries and returns structured solutions.

**Request Body:**
```json
{
  "issue": "My computer won't turn on",
  "os": "Windows",
  "device": "Desktop"
}
```

**Response Schema:**
```json
{
  "answer_title": "Brief title",
  "one_paragraph_summary": "Summary of the solution",
  "prereqs": ["requirement1", "requirement2"],
  "steps": [
    {
      "title": "Step title",
      "detail": "Detailed instructions",
      "os": ["Windows"],
      "est_minutes": 5,
      "shell": ["command1", "command2"]
    }
  ],
  "decision_tree": [
    {
      "if": "Condition description",
      "then": "Action to take",
      "link_step": 2
    }
  ],
  "diagrams": [
    {
      "caption": "Diagram description",
      "svg": "<svg>...</svg>"
    }
  ],
  "citations": [
    {
      "url": "https://example.com",
      "title": "Source title",
      "quote": "Relevant quote from source"
    }
  ],
  "warnings": ["warning1", "warning2"]
}
```

## Available Tools

The AI model can use these tools to provide better solutions:

1. **search_web(query, topK)**: Search for relevant information using Brave Search API
2. **fetch_page(url)**: Get content from specific webpages with HTML parsing
3. **make_svg_diagram(spec)**: Generate visual diagrams from text specifications

## Rate Limiting

- 10 requests per 10 minutes per IP address
- Built-in LRU caching (100 items, 6-hour TTL)
- Configurable via the `TokenBucketRateLimiter` class

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── answer/
│   │       └── route.ts          # API endpoint with rate limiting & caching
│   ├── it-support/
│   │   └── page.tsx              # IT support interface
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── lib/
│   ├── answerSchema.ts           # Answer validation schema
│   ├── tools.ts                  # Tool implementations
│   ├── llm.ts                    # LLM orchestration
│   ├── runbooks.ts               # Common issue runbooks
│   ├── rubric.ts                 # Answer quality validation
│   └── config.ts                 # Environment configuration
tests/
├── setup.ts                      # Test setup and mocks
├── schema.test.ts                # Schema validation tests
└── tools.test.ts                 # Tool function tests
vitest.config.ts                  # Vitest configuration
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-3.5-turbo | `sk-abc123...` |
| `BRAVE_API_KEY` | Yes | Brave Search API key | `abc123def456...` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details