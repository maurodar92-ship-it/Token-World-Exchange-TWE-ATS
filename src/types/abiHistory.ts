/**
 * Types for ABI Generation History Stack & Version Comparison
 */

export type ABIFormatType =
  | "single_line_json"
  | "single_line_human"
  | "single_line_ethers"
  | "single_line_viem"
  | "single_line_web3"
  | "single_line_cast";

export interface ABIHistoryVersion {
  id: string;
  versionNumber: number;
  timestamp: string;
  formattedTime: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  tokenStandard: string;
  chain: string;
  format: ABIFormatType;
  abiCode: string;
  entryCount: number;
  charCount: number;
  isValid: boolean;
  score: number;
  label?: string;
  notes?: string;
}
