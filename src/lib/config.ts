/**
 * Environment configuration validation
 * Ensures required environment variables are present at startup
 */

export interface Config {
  OPENAI_API_KEY: string;
  BRAVE_API_KEY: string;
}

/**
 * Get validated configuration values
 * @returns Config object with validated environment variables
 * @throws Error if required environment variables are missing
 */
export function getConfig(): Config {
  const config: Config = {
    OPENAI_API_KEY: '',
    BRAVE_API_KEY: '',
  };

  // Validate OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'Missing required environment variable: OPENAI_API_KEY\n' +
      'Please add OPENAI_API_KEY=your_key_here to your .env.local file\n' +
      'Get your key from: https://platform.openai.com/api-keys'
    );
  }
  config.OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // Validate BRAVE_API_KEY
  if (!process.env.BRAVE_API_KEY) {
    throw new Error(
      'Missing required environment variable: BRAVE_API_KEY\n' +
      'Please add BRAVE_API_KEY=your_key_here to your .env.local file\n' +
      'Get your key from: https://api.search.brave.com/app'
    );
  }
  config.BRAVE_API_KEY = process.env.BRAVE_API_KEY;

  // Validate key formats (basic checks)
  if (!config.OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error(
      'Invalid OPENAI_API_KEY format. OpenAI API keys should start with "sk-"\n' +
      'Please check your key at: https://platform.openai.com/api-keys'
    );
  }

  if (config.BRAVE_API_KEY.length < 10) {
    throw new Error(
      'Invalid BRAVE_API_KEY format. Brave Search API keys should be longer than 10 characters\n' +
      'Please check your key at: https://api.search.brave.com/app'
    );
  }

  return config;
}

/**
 * Check if all required environment variables are present
 * @returns true if all required variables are set, false otherwise
 */
export function hasRequiredEnvVars(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a specific environment variable value
 * @param key The environment variable key
 * @returns The value or undefined if not set
 */
export function getEnvVar(key: keyof Config): string | undefined {
  return process.env[key];
}

/**
 * Get configuration with fallback to mock mode
 * @returns Config object or null if in mock mode
 */
export function getConfigOrMock(): Config | null {
  try {
    return getConfig();
  } catch {
    console.warn('⚠️  Running in mock mode due to missing environment variables');
    console.warn('   Some features will be limited. Set up your .env.local file for full functionality.');
    return null;
  }
}
