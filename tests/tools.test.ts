import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search_web, fetch_page, make_svg_diagram } from '@/lib/tools';

describe('search_web', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.BRAVE_API_KEY;
  });

  it('should return mock results when BRAVE_API_KEY is not set', async () => {
    const results = await search_web('WiFi issues');
    
    expect(results).toHaveLength(3);
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('url');
    expect(results[0]).toHaveProperty('snippet');
    expect(results[0].title).toContain('WiFi issues');
  });

  it('should respect topK parameter', async () => {
    const results = await search_web('WiFi issues', 1);
    expect(results).toHaveLength(1);
  });

  it('should filter out junk URLs by default', async () => {
    // Mock fetch to return results with junk URLs
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            { title: 'Good Result', url: 'https://example.com/help', description: 'Helpful content' },
            { title: 'PDF Result', url: 'https://example.com/doc.pdf', description: 'PDF content' },
            { title: 'Login Page', url: 'https://example.com/login', description: 'Login required' }
          ]
        }
      })
    });

    process.env.BRAVE_API_KEY = 'test-key';
    
    const results = await search_web('WiFi issues', 5);
    
    // Should filter out PDF and login pages
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/help');
  });

  it('should not filter when query explicitly requests filtered content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        web: {
          results: [
            { title: 'PDF Guide', url: 'https://example.com/guide.pdf', description: 'PDF guide' }
          ]
        }
      })
    });

    process.env.BRAVE_API_KEY = 'test-key';
    
    const results = await search_web('WiFi issues PDF guide', 5);
    
    // Should not filter when query mentions PDF
    expect(results).toHaveLength(1);
    expect(results[0].url).toContain('.pdf');
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    process.env.BRAVE_API_KEY = 'test-key';
    
    const results = await search_web('WiFi issues');
    
    // Should fall back to mock results on error
    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('Search results for');
  });

  it('should handle network timeouts', async () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 100);
      })
    );

    process.env.BRAVE_API_KEY = 'test-key';
    
    const results = await search_web('WiFi issues');
    
    // Should fall back to mock results on timeout
    expect(results).toHaveLength(1);
  });
});

describe('fetch_page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse page content successfully', async () => {
    const mockHtml = '<html><body><h1>Test Heading</h1><p>Test content</p></body></html>';
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(mockHtml)
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetch_page('https://example.com');

    expect(result).toHaveProperty('clean_text');
    expect(result).toHaveProperty('headings');
    // The cheerio mock should process the actual HTML content
    expect(result.headings).toHaveLength(1);
    expect(result.headings).toContain('Test Heading');
    expect(result.clean_text).toContain('Test content');
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetch_page('https://invalid-url.com');

    expect(result.clean_text).toContain('Unable to fetch content from');
    expect(result.headings).toHaveLength(0);
  });

  it('should handle HTTP errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const result = await fetch_page('https://example.com/not-found');

    expect(result.clean_text).toContain('Unable to fetch content from');
  });

  it('should limit text content length', async () => {
    const longText = 'a'.repeat(50000);
    const mockHtml = `<html><body><p>${longText}</p></body></html>`;
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(mockHtml)
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetch_page('https://example.com');

    // The cheerio mock should process the actual HTML content
    expect(result.clean_text).toContain('a');
    // Account for the "..." that gets added when truncating
    expect(result.clean_text.length).toBeLessThanOrEqual(40003);
  });

  it('should handle timeouts', async () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 100);
      })
    );

    const result = await fetch_page('https://example.com');

    expect(result.clean_text).toContain('Unable to fetch content from');
  });

  it('should extract headings correctly', async () => {
    const mockHtml = '<html><body><h1>Main Title</h1><h2>Subtitle</h2><h3>Section</h3></body></html>';
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(mockHtml)
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetch_page('https://example.com');

    expect(result.headings).toHaveLength(3);
    expect(result.headings).toContain('Main Title');
    expect(result.headings).toContain('Subtitle');
    expect(result.headings).toContain('Section');
  });

  it('should limit headings to 20', async () => {
    const mockHtml = '<html><body>' + 
      Array.from({ length: 25 }, (_, i) => `<h1>Heading ${i + 1}</h1>`).join('') + 
      '</body></html>';
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(mockHtml)
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetch_page('https://example.com');

    expect(result.headings).toHaveLength(20);
  });
});

describe('make_svg_diagram', () => {
  it('should generate SVG from simple specification', () => {
    const result = make_svg_diagram('A -> B -> C');
    
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('A');
    expect(result.svg).toContain('B');
    expect(result.svg).toContain('C');
    expect(result.svg).toContain('width=');
    expect(result.svg).toContain('height=');
  });

  it('should handle different arrow formats', () => {
    const result1 = make_svg_diagram('A -> B -> C');
    const result2 = make_svg_diagram('A → B → C');
    const result3 = make_svg_diagram('A to B to C');
    const result4 = make_svg_diagram('A then B then C');
    
    expect(result1.svg).toContain('<svg');
    expect(result2.svg).toContain('<svg');
    expect(result3.svg).toContain('<svg');
    expect(result4.svg).toContain('<svg');
  });

  it('should handle empty specification', () => {
    const result = make_svg_diagram('');
    
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('IT Support Flow');
    expect(result.svg).toContain('IT Support Flow'); // This is what it actually shows
  });

  it('should handle single element', () => {
    const result = make_svg_diagram('Single Element');
    
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('Single Element');
    expect(result.svg).not.toContain('arrowhead');
  });

  it('should generate proper SVG structure', () => {
    const result = make_svg_diagram('Start -> Middle -> End');
    
    expect(result.svg).toMatch(/^<svg.*>.*<\/svg>$/);
    expect(result.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result.svg).toContain('marker id="arrowhead"');
  });

  it('should handle long text with truncation', () => {
    const longText = 'This is a very long step description that should be truncated';
    const result = make_svg_diagram(`Start -> ${longText} -> End`);
    
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('This is a ve...'); // Actual truncation
    expect(result.svg).toContain('End');
  });

  it('should use different colors for different elements', () => {
    const result = make_svg_diagram('A -> B -> C -> D');
    
    expect(result.svg).toContain('fill="#e3f2fd"'); // First color
    expect(result.svg).toContain('fill="#f3e5f5"'); // Second color
    expect(result.svg).toContain('fill="#e8f5e8"'); // Third color
  });

  it('should calculate dimensions correctly', () => {
    const result = make_svg_diagram('A -> B -> C');
    
    // 3 elements: 3 * (120 + 40) + 20 = 500 width
    expect(result.svg).toContain('width="500"');
    // Height: 60 + 40 = 100
    expect(result.svg).toContain('height="100"');
  });
});
