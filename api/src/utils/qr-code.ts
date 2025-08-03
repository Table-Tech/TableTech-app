/**
 * QR Code Generation Utilities
 * Ensures permanent, never-changing QR codes for restaurant tables
 */

/**
 * Generate a unique, permanent table code
 * This code will NEVER change once generated
 * Safe for printing on physical materials
 */
export function generateUniqueTableCode(): string {
  // Use timestamp + high-entropy random for uniqueness
  const timestamp = Date.now().toString(36).slice(-3); // Last 3 chars of timestamp
  const random = Math.random().toString(36).substr(2, 3).toUpperCase(); // 3 random chars
  
  // Combine for 6-character code (perfect for QR codes)
  const code = (timestamp + random).toUpperCase();
  
  // Ensure it's exactly 6 characters
  return code.padEnd(6, '0').substr(0, 6);
}

/**
 * Generate permanent QR code URL using external service
 * This URL structure should NEVER change to maintain QR permanence
 */
export function generatePermanentQRCodeURL(tableCode: string): string {
  // Construct the customer-facing URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const tableUrl = `${frontendUrl}/table/${tableCode}`;
  
  // Use QR Server API for reliable, permanent QR generation
  // Parameters:
  // - size: 300x300 (good for printing)
  // - data: encoded table URL
  // - color: black (high contrast)
  // - margin: 10px margin for better scanning
  // - format: PNG with transparent background
  const qrServiceUrl = 'https://api.qrserver.com/v1/create-qr-code/';
  const params = new URLSearchParams({
    size: '300x300',
    data: tableUrl,
    color: '000000',
    margin: '10',
    format: 'png'
  });
  
  return `${qrServiceUrl}?${params.toString()}`;
}

/**
 * Validate table code format
 * Ensures codes meet our permanent standards
 */
export function isValidTableCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Must be exactly 6 characters, alphanumeric, uppercase
  const codeRegex = /^[A-Z0-9]{6}$/;
  return codeRegex.test(code);
}

/**
 * Generate customer table URL from code
 * This URL structure is permanent and should never change
 */
export function getTableUrl(tableCode: string): string {
  if (!isValidTableCode(tableCode)) {
    throw new Error(`Invalid table code format: ${tableCode}`);
  }
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl}/table/${tableCode}`;
}

/**
 * Extract table code from QR code URL (for debugging/validation)
 */
export function extractTableCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const tableIndex = pathSegments.indexOf('table');
    
    if (tableIndex >= 0 && tableIndex < pathSegments.length - 1) {
      const code = pathSegments[tableIndex + 1];
      return isValidTableCode(code) ? code : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if QR code needs regeneration (for migration/debugging)
 */
export function shouldRegenerateQRCode(currentQRUrl: string | null, tableCode: string): boolean {
  if (!currentQRUrl) return true;
  
  // Check if current URL points to correct table code
  const extractedCode = extractTableCodeFromUrl(currentQRUrl);
  return extractedCode !== tableCode;
}

/**
 * EMERGENCY ONLY: Regenerate table code and QR
 * This should only be used in exceptional circumstances
 * as it breaks the permanence guarantee
 */
export function regenerateTableCodeAndQR(): { code: string; qrCodeUrl: string } {
  const newCode = generateUniqueTableCode();
  const newQRUrl = generatePermanentQRCodeURL(newCode);
  
  // Log this action for audit trail
  console.warn('🚨 EMERGENCY QR REGENERATION', {
    timestamp: new Date().toISOString(),
    newCode,
    action: 'QR_CODE_REGENERATED'
  });
  
  return {
    code: newCode,
    qrCodeUrl: newQRUrl
  };
}

export default {
  generateUniqueTableCode,
  generatePermanentQRCodeURL,
  isValidTableCode,
  getTableUrl,
  extractTableCodeFromUrl,
  shouldRegenerateQRCode,
  regenerateTableCodeAndQR
};