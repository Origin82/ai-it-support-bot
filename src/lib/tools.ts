import { z } from 'zod';
import pLimit from 'p-limit';

// Tool function schemas
export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
});

export const PageContentSchema = z.object({
  clean_text: z.string(),
  headings: z.array(z.string()),
});

export const DiagramSchema = z.object({
  svg: z.string(),
});

// Types
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type PageContent = z.infer<typeof PageContentSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;

// Parallel execution helper
export const parallel = pLimit(4);

// Brave Search API types
interface BraveSearchResponse {
  web: {
    results: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
}

// Helper function to check if URL should be filtered out
function shouldFilterUrl(url: string, query: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Filter out obvious junk unless query suggests otherwise
  const junkPatterns = [
    /\.pdf$/i,
    /\.docx?$/i,
    /\.xlsx?$/i,
    /\.pptx?$/i,
    /login/i,
    /signin/i,
    /auth/i,
    /admin/i,
    /dashboard/i,
    /\.gov\/login/i,
    /\.edu\/login/i,
    /\.com\/login/i,
  ];
  
  // Don't filter if query explicitly asks for these types
  const explicitRequests = [
    'pdf', 'document', 'login', 'admin', 'dashboard',
    'government', 'education', 'official'
  ];
  
  const hasExplicitRequest = explicitRequests.some(term => lowerQuery.includes(term));
  
  if (hasExplicitRequest) {
    return false;
  }
  
  return junkPatterns.some(pattern => pattern.test(lowerUrl));
}

/**
 * Search the web using Brave Search API
 * @param query Search query string
 * @param topK Maximum number of results to return (default: 5)
 * @returns Array of search results with title, URL, and snippet
 */
export async function search_web(query: string, topK: number = 5): Promise<SearchResult[]> {
  const braveKey = process.env.BRAVE_API_KEY;
  
  if (!braveKey) {
    console.warn('BRAVE_API_KEY not found, returning mock results');
    // Fallback to mock results for development
    const mockResults: SearchResult[] = [
      {
        title: `How to fix ${query} - Tech Support Guide`,
        url: `https://example.com/fix-${query.replace(/\s+/g, '-').toLowerCase()}`,
        snippet: `Comprehensive guide to resolve ${query} issues on various operating systems.`,
      },
      {
        title: `${query} Troubleshooting Steps`,
        url: `https://support.example.com/${query.replace(/\s+/g, '-').toLowerCase()}`,
        snippet: `Step-by-step troubleshooting for ${query} problems.`,
      },
      {
        title: `${query} - Official Support Documentation`,
        url: `https://docs.example.com/${query.replace(/\s+/g, '-').toLowerCase()}`,
        snippet: `Official documentation and support resources for ${query} issues.`,
      },
    ];
    return mockResults.slice(0, topK);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Clean and encode the query properly
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    const encodedQuery = encodeURIComponent(cleanQuery);
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=${Math.min(topK * 2, 50)}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveKey,
          'User-Agent': 'ITBot/1.0',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Brave Search API error ${response.status}: ${errorText}`);
      console.error(`Query: "${cleanQuery}"`);
      console.error(`Encoded query: "${encodedQuery}"`);
      console.error(`URL: https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=${Math.min(topK * 2, 50)}`);
      
      // Return mock results on API error instead of throwing
      console.warn('Returning mock search results due to API error');
      const mockResults: SearchResult[] = [
        {
          title: `Search results for: ${cleanQuery}`,
          url: `https://example.com/search-${cleanQuery.replace(/\s+/g, '-').toLowerCase()}`,
          snippet: `Search results for ${cleanQuery}. Brave Search API returned error ${response.status}.`,
        },
        {
          title: `IT Support: ${cleanQuery}`,
          url: `https://support.microsoft.com/search?query=${encodeURIComponent(cleanQuery)}`,
          snippet: `Microsoft Support documentation for ${cleanQuery}. Check official Microsoft support resources.`,
        },
        {
          title: `Apple Support: ${cleanQuery}`,
          url: `https://support.apple.com/search?q=${encodeURIComponent(cleanQuery)}`,
          snippet: `Apple Support documentation for ${cleanQuery}. Check official Apple support resources.`,
        }
      ];
      return mockResults.slice(0, topK);
    }
    
    const data: BraveSearchResponse = await response.json();
    
    if (!data.web?.results) {
      return [];
    }
    
    // Filter and process results
    const filteredResults = data.web.results
      .filter(result => !shouldFilterUrl(result.url, query))
      .map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
      }))
      .slice(0, topK);
    
    return filteredResults;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Search request timed out');
    } else {
      console.error('Search error:', error);
    }
    
    // Return mock results on error
    const mockResults: SearchResult[] = [
      {
        title: `Search results for: ${query}`,
        url: `https://example.com/search-${query.replace(/\s+/g, '-').toLowerCase()}`,
        snippet: `Search results for ${query}. Please try again later.`,
      },
    ];
    return mockResults.slice(0, topK);
  }
}

/**
 * Fetch and parse webpage content
 * @param url URL to fetch
 * @returns Cleaned page content with headings and text
 */
export async function fetch_page(url: string): Promise<PageContent> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ITBot/1.0)',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use dynamic import for cheerio to avoid SSR issues
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, iframe, noscript, meta, link, head').remove();
    
    // Extract headings (h1-h3 only, up to 20)
    const headings: string[] = [];
    $('h1, h2, h3').each((_, element) => {
      if (headings.length < 20) {
        const text = $(element).text().trim();
        if (text && text.length > 0) {
          headings.push(text);
        }
      }
    });
    
    // Extract clean text from body
    let cleanText = $('body').text()
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    // Truncate to 40k characters
    if (cleanText.length > 40000) {
      cleanText = cleanText.substring(0, 40000) + '...';
    }
    
    return {
      clean_text: cleanText,
      headings: headings,
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Page fetch timed out:', url);
    } else {
      console.error('Error fetching page:', url, error);
    }
    
    return {
      clean_text: `Unable to fetch content from ${url}. Please check the URL and try again.`,
      headings: [],
    };
  }
}

/**
 * Generate SVG diagram from text specification
 * @param spec Text specification like "User PC -> Wi-Fi Router -> ISP Modem"
 * @returns SVG string with rounded boxes and arrows
 */
export function make_svg_diagram(spec: string): Diagram {
  if (!spec || spec.trim().length === 0) {
    spec = 'IT Support Flow';
  }
  
  // Parse the specification
  const parts = spec.split(/->|→|to|then/).map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    parts.push('Process');
  }
  
  const boxWidth = 120;
  const boxHeight = 60;
  const arrowLength = 40;
  const padding = 20;
  const totalWidth = parts.length * (boxWidth + arrowLength) + padding;
  const totalHeight = boxHeight + padding * 2;
  
  let svg = `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Add background
  svg += `<rect width="${totalWidth}" height="${totalHeight}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" rx="8"/>`;
  
  // Add title
  svg += `<text x="${totalWidth / 2}" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#495057">IT Support Flow</text>`;
  
  // Generate boxes and arrows
  parts.forEach((part, index) => {
    const x = padding + index * (boxWidth + arrowLength);
    const y = padding + 20;
    
    // Box
    const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#fce4ec'];
    const color = colors[index % colors.length];
    const strokeColor = ['#2196f3', '#9c27b0', '#4caf50', '#ff9800', '#e91e63'][index % 5];
    
    svg += `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="${color}" stroke="${strokeColor}" stroke-width="2" rx="8"/>`;
    
    // Text in box (truncate if too long)
    const displayText = part.length > 15 ? part.substring(0, 12) + '...' : part;
    svg += `<text x="${x + boxWidth / 2}" y="${y + boxHeight / 2 + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${displayText}</text>`;
    
    // Arrow to next box (except for last box)
    if (index < parts.length - 1) {
      const arrowX = x + boxWidth + arrowLength / 2;
      const arrowY = y + boxHeight / 2;
      
      svg += `<line x1="${x + boxWidth}" y1="${arrowY}" x2="${arrowX}" y2="${arrowY}" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      
      // Arrowhead
      if (index === 0) {
        svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">`;
        svg += `<polygon points="0 0, 10 3.5, 0 7" fill="#666"/>`;
        svg += `</marker></defs>`;
      }
    }
  });
  
  svg += '</svg>';
  
  return { svg: svg.trim() };
}


