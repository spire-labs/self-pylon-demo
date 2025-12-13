interface FaucetResponse {
  txHash: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * Request test funds from the Celo faucet for the given address
 * Tries the primary endpoint first, then falls back to the backup endpoint
 * @param address - The wallet address to fund
 * @returns Promise that resolves to the transaction hash on success, or null on error
 */
export async function requestFaucetFunds(address: string): Promise<string | null> {
  if (!address || !address.startsWith('0x')) {
    console.error('[Faucet] Invalid address:', address);
    return null;
  }

  const endpoints = [
    'https://faucet.celo-mainnet.spire.dev/faucet', // Primary endpoint
    'https://celo-faucet.onrender.com/faucet' // Backup endpoint
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[Faucet] Trying endpoint: ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      console.log(`[Faucet] Response status from ${endpoint}:`, res.status, res.statusText);
      
      let responseData: FaucetResponse | ErrorResponse;
      try {
        responseData = await res.json();
        console.log(`[Faucet] Response JSON from ${endpoint}:`, responseData);
      } catch (e) {
        const text = await res.text();
        console.error(`[Faucet] Failed to parse JSON response from ${endpoint}:`, text);
        // Continue to next endpoint if response isn't valid JSON
        continue;
      }

      // Check if response has txHash (success) or error (failure)
      if ('txHash' in responseData && responseData.txHash) {
        console.log(`[Faucet] Successfully requested funds from ${endpoint}, txHash: ${responseData.txHash}`);
        return responseData.txHash;
      } else if ('error' in responseData) {
        console.error(`[Faucet] Error from ${endpoint}:`, responseData.error);
        // Continue to next endpoint if this one returned an error
        continue;
      } else {
        console.error(`[Faucet] Unexpected response format from ${endpoint}`);
        // Continue to next endpoint
        continue;
      }
    } catch (err) {
      console.error(`[Faucet] Request error from ${endpoint} (likely CORS or network):`, err);
      // Continue to next endpoint if this one errored
      continue;
    }
  }

  // All endpoints failed
  console.error('[Faucet] All endpoints failed');
  return null;
}

