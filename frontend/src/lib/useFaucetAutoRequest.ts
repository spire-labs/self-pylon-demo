import { useEffect, useRef, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { pylon } from '../chains/pylon';
import { requestFaucetFunds } from './faucet';

/**
 * Hook that automatically requests faucet funds when user has zero balance on Pylon
 * Can be used anywhere in the app to ensure users get test funds as soon as they connect
 */
export function useFaucetAutoRequest() {
  const { address } = useAccount();
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);
  const faucetRequestedRef = useRef<Set<string>>(new Set());

  // Check user's balance on Pylon to determine if they need faucet funds
  const { data: pylonBalance, refetch: refetchBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: pylon.id,
  });

  // Consider user as having no funds if balance is 0 or undefined
  const hasNoFunds = !pylonBalance || pylonBalance.value === BigInt(0);

  // Automatically request faucet funds when user has zero balance on Pylon
  useEffect(() => {
    // Only request if:
    // 1. We have an address
    // 2. User has no funds on Pylon (checked via useBalance hook)
    // 3. We haven't already requested for this address in this session
    // 4. We're not already requesting
    if (
      !address ||
      !hasNoFunds ||
      isRequestingFaucet ||
      faucetRequestedRef.current.has(address.toLowerCase())
    ) {
      return;
    }

    // Request faucet funds automatically
    // Note: We check balance on Pylon regardless of current chain via useBalance hook
    const requestFunds = async () => {
      setIsRequestingFaucet(true);
      faucetRequestedRef.current.add(address.toLowerCase());

      console.log('[useFaucetAutoRequest] Requesting faucet funds for address:', address);
      const result = await requestFaucetFunds(address);

      if (result) {
        console.log('[useFaucetAutoRequest] Faucet request successful - funds confirmed on-chain');
        // Faucet only responds once funds are confirmed on-chain, so we can refetch immediately
        refetchBalance();
      } else {
        console.log('[useFaucetAutoRequest] Faucet request failed or was rejected');
      }

      setIsRequestingFaucet(false);
    };

    requestFunds();
  }, [address, hasNoFunds, isRequestingFaucet, refetchBalance]);

  return {
    isRequestingFaucet,
    hasNoFunds,
    pylonBalance
  };
}
