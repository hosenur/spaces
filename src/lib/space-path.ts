// URL-safe base64 encoding/decoding utilities
// Uses base64url format (replaces + with -, / with _, removes =)

export function encodeSpacePath(path: string): string {
  const encoded = btoa(encodeURIComponent(path));
  // Convert to URL-safe base64
  return encoded
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeSpacePath(encoded: string): string {
  try {
    // Convert from URL-safe base64 back to standard base64
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }
    
    return decodeURIComponent(atob(base64));
  } catch {
    console.error('Failed to decode space path:', encoded);
    return '';
  }
}
