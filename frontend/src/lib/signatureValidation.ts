/**
 * Signature validation utilities for EIP-191 signatures
 */

/**
 * Checks if a signature is a zero signature (all zeros)
 * @param signature The signature to check
 * @returns true if signature is all zeros
 */
export function isZeroSignature(signature: string): boolean {
  if (!signature) return true;
  
  // Remove 0x prefix if present
  const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
  
  // Check if all characters are '0'
  return /^0+$/.test(cleanSig);
}

/**
 * Validates the format of a signature string
 * @param signature The signature to validate
 * @returns true if signature has valid format (0x prefix + 130 hex characters)
 */
export function isValidSignatureFormat(signature: string): boolean {
  if (!signature) return false;
  
  // Must start with 0x
  if (!signature.startsWith('0x')) return false;
  
  // Must be exactly 130 hex characters after 0x (65 bytes = 130 hex chars)
  const hexPart = signature.slice(2);
  if (hexPart.length !== 130) return false;
  
  // Must be valid hexadecimal
  return /^[0-9a-fA-F]+$/.test(hexPart);
}

/**
 * Comprehensive signature validation
 * @param signature The signature to validate
 * @returns true if signature is valid (non-zero and properly formatted)
 */
export function isValidSignature(signature: string): boolean {
  if (!signature) return false;
  if (isZeroSignature(signature)) return false;
  return isValidSignatureFormat(signature);
}

/**
 * Validates signature format and returns error message if invalid
 * @param signature The signature to validate
 * @returns Error message if invalid, null if valid
 */
export function validateSignatureFormat(signature: string): string | null {
  if (!signature) {
    return 'Signature is empty';
  }
  
  if (!signature.startsWith('0x')) {
    return 'Signature must start with 0x';
  }
  
  const hexPart = signature.slice(2);
  if (hexPart.length !== 130) {
    return `Signature must be 130 hex characters (got ${hexPart.length})`;
  }
  
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    return 'Signature contains invalid hexadecimal characters';
  }
  
  return null;
}

