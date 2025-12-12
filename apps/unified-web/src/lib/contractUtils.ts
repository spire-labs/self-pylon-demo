import type { PublicClient } from 'viem';
import { BaseError, ContractFunctionRevertedError } from 'viem';
import { HumanNFTABI } from '@self-pylon-demo/abis';

/**
 * Extract a clean error message from various error formats
 */
export const extractErrorMessage = (error: any): string =>
  error?.shortMessage ??
  error?.message ??
  error?.cause?.reason ??
  error?.cause?.data ??
  error?.data?.message ??
  'Transaction failed';

/**
 * Remove "execution reverted" prefix from error messages
 */
export const cleanRevertMessage = (message: string): string =>
  message.replace(/execution reverted:\s*/gi, '').replace(/execution reverted/gi, '').trim();

/**
 * Check if error is an RPC-related error (not a contract revert)
 */
export const isRpcError = (error: any): boolean => {
  const message = error?.message || error?.shortMessage || '';
  return (
    message.includes('JSON is not a valid request object') ||
    message.includes('invalid request') ||
    error?.name === 'InvalidRequestRpcError' ||
    (error?.name === 'CallExecutionError' && message.includes('JSON'))
  );
};

/**
 * Check if error is a user rejection (wallet popup dismissed)
 */
export const isUserRejection = (error: any): boolean => {
  const message = error?.shortMessage || error?.message || error?.cause?.message || '';
  return message.includes('User rejected') || error?.name === 'UserRejectedRequestError';
};

/**
 * Extract revert reason from a viem error, returns null if it's an RPC error
 */
export const extractRevertReason = (callError: any): string | null => {
  if (isRpcError(callError)) return null;

  // Prefer viem's decoded revert error when available
  if (callError instanceof BaseError) {
    const revertError = callError.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      // Custom error name/args if available, otherwise fallback to message
      if (revertError.data?.errorName) {
        const args = revertError.data.args?.length ? `(${revertError.data.args.map(String).join(', ')})` : '';
        return cleanRevertMessage(`${revertError.data.errorName}${args}`);
      }
      if (revertError.shortMessage) return cleanRevertMessage(revertError.shortMessage);
      if (revertError.message) return cleanRevertMessage(revertError.message);
    }
  }

  const reason =
    callError?.shortMessage ||
    callError?.message ||
    callError?.data?.message ||
    callError?.data;
  return reason ? cleanRevertMessage(String(reason)) : null;
};

/**
 * Check if an error message indicates a nullifier was already used (sybil protection)
 */
export const isNullifierUsedError = (errorMessage: string): boolean =>
  errorMessage.includes('Nullifier already used') ||
  errorMessage.includes('already been used') ||
  (errorMessage.toLowerCase().includes('nullifier') && errorMessage.toLowerCase().includes('used'));

/**
 * Simulate a mint call to check if it would revert.
 * Returns the revert reason if it would fail, null if it would succeed.
 */
export const simulateMint = async (
  publicClient: PublicClient | undefined,
  address: `0x${string}` | undefined,
  nftAddress: `0x${string}` | undefined
): Promise<string | null> => {
  if (!publicClient || !address || !nftAddress || nftAddress === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  
  try {
    await publicClient.simulateContract({
      address: nftAddress,
      abi: HumanNFTABI,
      functionName: 'mint',
      args: [],
      account: address
    });
    return null; // No revert
  } catch (callError: any) {
    return extractRevertReason(callError);
  }
};

/**
 * Simulate the original mint at a specific block to retrieve the revert reason.
 * Mirrors the original tx params as closely as possible.
 */
export const getRevertReasonFromSimulate = async (
  publicClient: PublicClient | undefined,
  address: `0x${string}` | undefined,
  nftAddress: `0x${string}` | undefined,
  blockNumber?: bigint
): Promise<string | null> => {
  if (!publicClient || !address || !nftAddress || nftAddress === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  try {
    await publicClient.simulateContract({
      address: nftAddress,
      abi: HumanNFTABI,
      functionName: 'mint',
      args: [],
      account: address,
      blockNumber
    });
    return null;
  } catch (err: any) {
    return extractRevertReason(err);
  }
};
