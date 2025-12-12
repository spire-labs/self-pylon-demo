/**
 * Base path utility
 * 
 * This ensures consistent basePath usage across the app.
 * The basePath is used for GitHub Pages deployment and local testing.
 * 
 * Default: '/self-pylon-demo'
 * Override: Set NEXT_PUBLIC_BASE_PATH environment variable
 */
export const getBasePath = (): string => {
  // In browser/client: use the environment variable (injected at build time)
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_PATH || '/self-pylon-demo';
  }
  
  // In server/build: use the environment variable or default
  return process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '/self-pylon-demo';
};

// Export the basePath as a constant for use in config files
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '/self-pylon-demo';
