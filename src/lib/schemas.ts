import { z } from 'zod';

// Input validation schema
export const AnswerRequestSchema = z.object({
  issue: z.string().min(1, 'Issue description is required'),
  os: z.enum(['Windows', 'macOS', 'Android', 'iOS', 'ChromeOS', 'Linux']),
  device: z.string().min(1, 'Device type is required'),
});
