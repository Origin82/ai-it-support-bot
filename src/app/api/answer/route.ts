import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AnswerRequestSchema } from '@/lib/schemas';
import { answerIssue } from '@/lib/llm';
import crypto from 'crypto';

// Simple LRU Cache implementation
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, { value: V; timestamp: number }>;
  private ttl: number; // TTL in milliseconds

  constructor(capacity: number, ttlHours: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.ttl = ttlHours * 60 * 60 * 1000;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    this.cache.delete(key);

    // Remove oldest if at capacity
    if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new item
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  size(): number {
    return this.cache.size;
  }
}

// Token bucket rate limiter per IP
class TokenBucketRateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }>;
  private maxTokens: number;
  private refillRate: number; // tokens per millisecond
  private refillInterval: number; // milliseconds

  constructor(maxTokens: number, refillIntervalMs: number) {
    this.buckets = new Map();
    this.maxTokens = maxTokens;
    this.refillInterval = refillIntervalMs;
    this.refillRate = maxTokens / refillIntervalMs;
  }

  consume(ip: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(ip) || { tokens: this.maxTokens, lastRefill: now };

    // Refill tokens
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we can consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(ip, bucket);
      return true;
    }

    // Update bucket even if we can't consume
    this.buckets.set(ip, bucket);
    return false;
  }

  getRemainingTokens(ip: string): number {
    const bucket = this.buckets.get(ip);
    if (!bucket) return this.maxTokens;
    
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    return Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
  }
}

// Initialize cache and rate limiter
const cache = new LRUCache<string, unknown>(100, 6); // 100 items, 6 hours TTL
const rateLimiter = new TokenBucketRateLimiter(10, 10 * 60 * 1000); // 10 tokens per 10 minutes

// Telemetry logging
interface TelemetryLog {
  ts: number;
  ipHash: string;
  issueLen: number;
  os: string;
  device: string;
  durationMs: number;
  sourcesCount: number;
  cacheHit: boolean;
}

function logTelemetry(log: TelemetryLog): void {
  // Keep logs small and readable, no secrets
  console.log(`[TELEMETRY] ${JSON.stringify(log)}`);
}

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 8);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sourcesCount = 0;

  try {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIP = forwarded?.split(',')[0] || realIp || 'anonymous';
    const ipHash = hashIP(clientIP);

    // Rate limiting
    if (!rateLimiter.consume(clientIP)) {
      const remaining = rateLimiter.getRemainingTokens(clientIP);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((10 * 60 * 1000 - (Date.now() % (10 * 60 * 1000))) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(Date.now() + (10 * 60 * 1000)).toISOString()
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AnswerRequestSchema.parse(body);
    const { issue, os, device } = validatedData;

    // Check cache
    const cacheKey = JSON.stringify({ issue, os, device });
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      // Log telemetry for cache hit
      const durationMs = Date.now() - startTime;
      logTelemetry({
        ts: Date.now(),
        ipHash,
        issueLen: issue.length,
        os,
        device,
        durationMs,
        sourcesCount: 0,
        cacheHit: true
      });

      return NextResponse.json(cachedResult, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Size': cache.size().toString()
        }
      });
    }

    // Use the new LLM module
    const answer = await answerIssue({ issue, os, device });
    
    // Count sources (citations)
    sourcesCount = answer.citations?.length || 0;
    
    // Cache the result
    cache.set(cacheKey, answer);
    
    // Log telemetry
    const durationMs = Date.now() - startTime;
    logTelemetry({
      ts: Date.now(),
      ipHash,
      issueLen: issue.length,
      os,
      device,
      durationMs,
      sourcesCount,
      cacheHit: false
    });

    return NextResponse.json(answer, {
      headers: {
        'X-Cache': 'MISS',
        'X-Cache-Size': cache.size().toString(),
        'X-RateLimit-Remaining': rateLimiter.getRemainingTokens(clientIP).toString()
      }
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    // Log telemetry for errors (without sensitive data)
    try {
      const body = await request.json().catch(() => ({}));
      const { issue = '', os = '', device = '' } = body;
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const clientIP = forwarded?.split(',')[0] || realIp || 'anonymous';
      const ipHash = hashIP(clientIP);
      
      logTelemetry({
        ts: Date.now(),
        ipHash,
        issueLen: issue.length,
        os: os || '',
        device: device || '',
        durationMs,
        sourcesCount: 0,
        cacheHit: false
      });
    } catch (telemetryError) {
      // Don't let telemetry errors break the main error handling
      console.warn('Failed to log telemetry for error:', telemetryError);
    }

    console.error('API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    // Don't expose internal errors or stack traces
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
