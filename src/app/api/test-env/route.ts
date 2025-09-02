import { NextResponse } from 'next/server';

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const braveKey = process.env.BRAVE_API_KEY;
  
  return NextResponse.json({
    openaiKeyExists: !!openaiKey,
    openaiKeyLength: openaiKey ? openaiKey.length : 0,
    openaiKeyStart: openaiKey ? openaiKey.substring(0, 10) + '...' : 'none',
    braveKeyExists: !!braveKey,
    braveKeyLength: braveKey ? braveKey.length : 0,
    braveKeyStart: braveKey ? braveKey.substring(0, 10) + '...' : 'none',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('API_KEY') || key.includes('OPENAI') || key.includes('BRAVE')),
    timestamp: new Date().toISOString(),
  });
}
