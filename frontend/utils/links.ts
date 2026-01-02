/**
 * Link Detection and Formatting Utility
 * Detects URLs in text and formats them for display
 */

// URL regex pattern - matches http, https, www, and common domains
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;

export interface LinkMatch {
  text: string;
  url: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Find all URLs in text
 * @param text - The text to search for URLs
 * @returns Array of link matches with their positions
 */
export function findLinks(text: string): LinkMatch[] {
  const links: LinkMatch[] = [];
  let match: RegExpExecArray | null;
  
  // Reset regex lastIndex to ensure we get all matches
  URL_PATTERN.lastIndex = 0;
  
  while ((match = URL_PATTERN.exec(text)) !== null) {
    let url = match[0];
    // Add https:// if URL starts with www.
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    
    links.push({
      text: match[0],
      url: url,
      startIndex: match.index || 0,
      endIndex: (match.index || 0) + match[0].length,
    });
  }
  
  return links;
}

/**
 * Format text with clickable links
 * Splits text into segments (text and links)
 * @param text - The text to format
 * @returns Array of segments with type and content
 */
export interface TextSegment {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

export function formatTextWithLinks(text: string): TextSegment[] {
  const links = findLinks(text);
  if (links.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  
  // Sort links by start index
  const sortedLinks = [...links].sort((a, b) => a.startIndex - b.startIndex);
  
  for (const link of sortedLinks) {
    // Add text before link
    if (link.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, link.startIndex),
      });
    }
    
    // Add link
    segments.push({
      type: 'link',
      content: link.text,
      url: link.url,
    });
    
    lastIndex = link.endIndex;
  }
  
  // Add remaining text after last link
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }
  
  return segments;
}

