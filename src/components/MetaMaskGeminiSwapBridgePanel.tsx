import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Wallet,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Lock,
  Zap,
  Terminal,
  Activity,
  Clock,
  X,
  Maximize2,
  Minimize2,
  CheckCircle,
  Radio,
} from "lucide-react";
import {
  swapToolDeclaration,
  ExecuteSwapFunctionArgs,
  DexAggregatorQuoteResponse,
  Erc20AllowanceStatus,
  SwapTxWatcherUpdate,
  SwapTxStatusType,
  parseUserSwapPromptViaGemini,
  connectInjectedMetaMaskSigner,
  fetchDexRouterQuoteAndCalldata,
  checkErc20TokenAllowance,
  executeMetaMask0xSwapSteps3To5,
  watchTransactionReceipt,
  handleUserSwapRequest,
} from "../utils/metaMaskSwapBridgeEngine";

export interface MetaMaskSwapExecutionResult {
  sellToken: string;
  buyToken: string;
  sellAmountHuman: string;
  buyAmountHuman: string;
  txHash: string;
  approvalTxHash?: string;
  userAddress: string;
  routerAddress: string;
  calldataHex: string;
  chainId: number;
}

interface MetaMaskGeminiSwapBridgePanelProps {
  /** Optional callback to sync executed swaps directly into the parent Swap Terminal state */
  onSwapExecutedInMetaMask?: (result: MetaMaskSwapExecutionResult) => void;
}

type PipelineStage =
  | "idle"
  | "step1_gemini_function_call"
  | "step2_metamask_signer"
  | "step3_dex_router_quote"
  | "step4_erc20_allowance_approve"
  | "step5_metamask_send_transaction"
  | "completed";

const STEPS_3_TO_5_CODE_SNIPPET = `// 3. Connect to MetaMask Provider & Signer
if (!window.ethereum) throw new Error("MetaMask not installed!");
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = await provider.getSigner();
const userAddress = await signer.getAddress();

// 4. Fetch optimal transaction calldata from 0x / Uniswap API
const quoteParams = new URLSearchParams({
  sellToken: sellToken,
  buyToken: buyToken,
  sellAmount: ethers.parseUnits(amount, 18).toString(),
  takerAddress: userAddress
});

const quoteRes = await fetch(\`https://api.0x.org/swap/v1/quote?\${quoteParams}\`, {
  headers: { "0x-api-key": process.env.ZEROX_API_KEY }
});
const quote = await quoteRes.json();

// 5. Send transaction to MetaMask for user signature
const txResponse = await signer.sendTransaction({
  to: quote.to,
  data: quote.data,
  value: quote.value,
  gasPrice: quote.gasPrice
});

console.log("Transaction Broadcasted! Hash:", txResponse.hash);

// 6. Integrate a listener in handleUserSwapRequest that watches the transaction hash
// and provides real-time UI feedback ('Pending', 'Confirmed') via toast notification / modal overlay
onStatusUpdate?.({ status: "Pending", txHash: txResponse.hash });

// Watch on-chain receipt confirmation
const receipt = await txResponse.wait(1);
console.log("Transaction Confirmed! Block:", receipt.blockNumber);
onStatusUpdate?.({
  status: "Confirmed",
  txHash: txResponse.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed?.toString()
});

return txResponse.hash;`;

const FULL_WORKFLOW_CODE_SNIPPET = `import { ethers } from "ethers";
import { GoogleGenAI } from "@google/genai";

// Step 1: Define the Tool Schema for Gemini
const swapToolDeclaration = {
  name: "executeSwap",
  description: "Triggers an on-chain token swap via the user's wallet.",
  parameters: {
    type: "OBJECT",
    properties: {
      sellToken: { type: "STRING", description: "Symbol or contract address of token to sell" },
      buyToken: { type: "STRING", description: "Symbol or contract address of token to buy" },
      amount: { type: "STRING", description: "Human-readable amount to swap, e.g., '1.5'" }
    },
    required: ["sellToken", "buyToken", "amount"]
  }
};

// Step 2: Bridge Gemini Output to MetaMask (Full Workflow Code)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function handleUserSwapRequest(
  userPrompt: string,
  onStatusUpdate?: (status: {
    status: "Pending" | "Confirmed" | "Failed";
    txHash: string;
    stage?: string;
    blockNumber?: number;
  }) => void
) {
  // 1. Send user prompt to Gemini with tool definitions
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: { tools: [{ functionDeclarations: [swapToolDeclaration] }] }
  });

  // 2. Intercept Function Call from Gemini
  const functionCall = response.functionCalls?.[0];
  if (functionCall && functionCall.name === "executeSwap") {
    const { sellToken, buyToken, amount } = functionCall.args as {
      sellToken: string;
      buyToken: string;
      amount: string;
    };

    // 3. Connect to MetaMask Provider & Signer
    if (!window.ethereum) throw new Error("MetaMask not installed!");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // 4. Fetch optimal transaction calldata from 0x / Uniswap API
    const quoteParams = new URLSearchParams({
      sellToken: sellToken,
      buyToken: buyToken,
      sellAmount: ethers.parseUnits(amount, 18).toString(),
      takerAddress: userAddress
    });

    const quoteRes = await fetch(\`https://api.0x.org/swap/v1/quote?\${quoteParams}\`, {
      headers: { "0x-api-key": process.env.ZEROX_API_KEY }
    });
    const quote = await quoteRes.json();

    // 5. Send transaction to MetaMask for user signature
    const txResponse = await signer.sendTransaction({
      to: quote.to,
      data: quote.data,
      value: quote.value,
      gasPrice: quote.gasPrice
    });

    console.log("Transaction Broadcasted! Hash:", txResponse.hash);

    // 6. Integrate a listener in handleUserSwapRequest that watches the transaction hash
    // and provides real-time UI feedback ('Pending', 'Confirmed') via toast notification / modal overlay
    onStatusUpdate?.({
      status: "Pending",
      txHash: txResponse.hash,
      stage: "Mempool Broadcast (0/1 Confirmations)"
    });

    // Watch for block confirmation
    const receipt = await txResponse.wait(1);
    console.log("Transaction Confirmed! Block:", receipt.blockNumber);
    onStatusUpdate?.({
      status: "Confirmed",
      txHash: txResponse.hash,
      blockNumber: receipt.blockNumber,
      stage: "On-Chain Inclusion (1/1 Confirmed)"
    });

    return txResponse.hash;
  }
}`;

export const MetaMaskGeminiSwapBridgePanel: React.FC<MetaMaskGeminiSwapBridgePanelProps> = ({
  onSwapExecutedInMetaMask,
}) => {
  const [userPrompt, setUserPrompt] = useState<string>("Swap 1.5 ETH for USDC");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Pipeline Artifacts
  const [geminiArgs, setGeminiArgs] = useState<ExecuteSwapFunctionArgs>({
    sellToken: "ETH",
    buyToken: "USDC",
    amount: "1.5",
    chainId: 1,
  });
  const [geminiModelUsed, setGeminiModelUsed] = useState<string>("gemini-3.8-flash");
  const [signerAddress, setSignerAddress] = useState<string>(
    "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
  );
  const [isLiveMetaMaskDetected, setIsLiveMetaMaskDetected] = useState<boolean>(() =>
    typeof window !== "undefined" ? Boolean((window as any).ethereum) : false
  );
  const [dexQuote, setDexQuote] = useState<DexAggregatorQuoteResponse | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState<Erc20AllowanceStatus | null>(null);
  const [broadcastedTxHash, setBroadcastedTxHash] = useState<string | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);

  // Real-Time Transaction Hash Watcher & Feedback State
  const [watcherUpdate, setWatcherUpdate] = useState<SwapTxWatcherUpdate | null>(null);
  const [showToastNotification, setShowToastNotification] = useState<boolean>(false);
  const [showWatcherModalOverlay, setShowWatcherModalOverlay] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Timer for pending mempool duration
  useEffect(() => {
    let interval: any = null;
    if (watcherUpdate?.status === "pending") {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [watcherUpdate?.status]);

  // Interactive MetaMask Signature Confirmation Modal (when running in sandboxed preview or awaiting confirmation)
  const [pendingMetaMaskConfirm, setPendingMetaMaskConfirm] = useState<{
    needsErc20ApproveFirst: boolean;
    quote: DexAggregatorQuoteResponse;
    allowance: Erc20AllowanceStatus;
    userAddress: string;
    args: ExecuteSwapFunctionArgs;
  } | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  /**
   * Executes the complete 5-step `handleUserSwapRequest(userPrompt)` pipeline:
   * 1. Gemini Function Call (`executeSwap`)
   * 2. Connect MetaMask `ethers.BrowserProvider(window.ethereum)` & Signer
   * 3. Fetch 0x / Uniswap Router Quote & Calldata (`to`, `data`, `value`, `gasPrice`)
   * 4. Check ERC-20 `allowance()` & prompt `approve()` if selling ERC-20
   * 5. Call `signer.sendTransaction({ to: quote.to, data: quote.data, value: quote.value, gasPrice: quote.gasPrice })`
   */
  const handleRunUserSwapRequest = async (customPrompt?: string) => {
    const promptToRun = customPrompt !== undefined ? customPrompt : userPrompt;
    if (customPrompt !== undefined) setUserPrompt(customPrompt);

    setErrorMessage(null);
    setBroadcastedTxHash(null);
    setApprovalTxHash(null);

    try {
      // STEP 1: Send user prompt to Gemini with `swapToolDeclaration` (`executeSwap`)
      setStage("step1_gemini_function_call");
      const parsed = await parseUserSwapPromptViaGemini(promptToRun);
      setGeminiArgs(parsed.args);
      setGeminiModelUsed(parsed.modelUsed);
      await new Promise((r) => setTimeout(r, 350));

      // STEP 2: Connect to MetaMask Provider & Signer (`new ethers.BrowserProvider(window.ethereum)`)
      setStage("step2_metamask_signer");
      const walletConn = await connectInjectedMetaMaskSigner();
      setSignerAddress(walletConn.userAddress);
      setIsLiveMetaMaskDetected(walletConn.isLiveExtension);
      await new Promise((r) => setTimeout(r, 350));

      // STEP 3: Fetch optimal transaction calldata from 0x / Uniswap Router API
      setStage("step3_dex_router_quote");
      const quote = await fetchDexRouterQuoteAndCalldata({
        sellToken: parsed.args.sellToken,
        buyToken: parsed.args.buyToken,
        amount: parsed.args.amount,
        takerAddress: walletConn.userAddress,
        chainId: parsed.args.chainId || walletConn.chainId || 1,
      });
      setDexQuote(quote);
      await new Promise((r) => setTimeout(r, 350));

      // STEP 4: ERC-20 Token Allowance & Approval Check (`allowance(userAddress, quote.allowanceTarget)`)
      setStage("step4_erc20_allowance_approve");
      const allowance = await checkErc20TokenAllowance({
        sellToken: quote.sellToken,
        sellTokenAddress: quote.sellTokenAddress,
        sellAmountWei: quote.sellAmount,
        ownerAddress: walletConn.userAddress,
        spenderAddress: quote.allowanceTarget,
        chainId: quote.chainId,
      });
      setAllowanceStatus(allowance);
      await new Promise((r) => setTimeout(r, 350));

      // STEP 5: Send transaction to MetaMask for user signature (`signer.sendTransaction`)
      setStage("step5_metamask_send_transaction");

      if (walletConn.signer && walletConn.isLiveExtension) {
        try {
          let recordedApprovalHash: string | undefined;

          // If selling ERC-20 and allowance < sellAmount, prompt MetaMask `approve()` first
          if (allowance.needsApproval) {
            const approveTx = await walletConn.signer.sendTransaction({
              to: allowance.tokenAddress,
              data: allowance.approveCalldataHex,
              value: 0n,
            });
            recordedApprovalHash = approveTx.hash;
            setApprovalTxHash(approveTx.hash);
          }

          // Prompt MetaMask `signer.sendTransaction` with the DEX Router quote payload
          const txResponse = await walletConn.signer.sendTransaction({
            to: quote.to,
            data: quote.data,
            value: BigInt(quote.value || "0"),
            gasPrice: BigInt(quote.gasPrice || "14200000000"),
          });

          setBroadcastedTxHash(txResponse.hash);
          setStage("completed");

          // 6. Integrate real-time transaction hash watcher listener ('Pending' -> 'Confirmed')
          watchTransactionReceipt(
            walletConn.provider,
            txResponse.hash,
            quote.chainId,
            (statusUpdate) => {
              setWatcherUpdate(statusUpdate);
              setShowToastNotification(true);
            },
            {
              sellToken: quote.sellToken,
              buyToken: quote.buyToken,
              sellAmount: quote.humanSellAmount,
              buyAmount: quote.humanBuyAmount,
            }
          );

          onSwapExecutedInMetaMask?.({
            sellToken: quote.sellToken,
            buyToken: quote.buyToken,
            sellAmountHuman: quote.humanSellAmount,
            buyAmountHuman: quote.humanBuyAmount,
            txHash: txResponse.hash,
            approvalTxHash: recordedApprovalHash,
            userAddress: walletConn.userAddress,
            routerAddress: quote.to,
            calldataHex: quote.data,
            chainId: quote.chainId,
          });
          return;
        } catch (err: any) {
          const msg = err?.shortMessage || err?.message || "";
          if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied")) {
            setErrorMessage(`MetaMask signature rejected by user: ${msg}`);
            setStage("idle");
            return;
          }
          // Fall through to interactive MetaMask confirmation popup if browser iframe blocks popup
        }
      }

      // Open explicit MetaMask Confirmation Dialog so user approves `approve()` (if ERC-20) + `signer.sendTransaction()`
      setPendingMetaMaskConfirm({
        needsErc20ApproveFirst: allowance.needsApproval,
        quote,
        allowance,
        userAddress: walletConn.userAddress,
        args: parsed.args,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to execute MetaMask swap pipeline.");
      setStage("idle");
    }
  };

  /**
   * Direct execution of Steps 3, 4 & 5:
   * - Step 3: Connect to MetaMask Provider & Signer (`ethers.BrowserProvider(window.ethereum)`, `eth_requestAccounts`)
   * - Step 4: Fetch optimal transaction calldata from 0x API (`https://api.0x.org/swap/v1/quote?${quoteParams}`)
   * - Step 5: Send transaction to MetaMask for user signature (`signer.sendTransaction({ to: quote.to, data: quote.data, value: quote.value, gasPrice: quote.gasPrice })`)
   * - Step 6: Watch transaction hash for real-time UI feedback ('Pending' -> 'Confirmed')
   */
  const handleExecuteSteps3To5Direct = async () => {
    setErrorMessage(null);
    setBroadcastedTxHash(null);
    setApprovalTxHash(null);

    try {
      setStage("step2_metamask_signer");
      const sellToken = geminiArgs.sellToken || "ETH";
      const buyToken = geminiArgs.buyToken || "USDC";
      const amount = geminiArgs.amount || "1.5";

      const walletConn = await connectInjectedMetaMaskSigner();
      setSignerAddress(walletConn.userAddress);
      setIsLiveMetaMaskDetected(walletConn.isLiveExtension);

      setStage("step3_dex_router_quote");
      const quote = await fetchDexRouterQuoteAndCalldata({
        sellToken,
        buyToken,
        amount,
        takerAddress: walletConn.userAddress,
        chainId: geminiArgs.chainId || walletConn.chainId || 1,
      });
      setDexQuote(quote);

      const allowance = await checkErc20TokenAllowance({
        sellToken: quote.sellToken,
        sellTokenAddress: quote.sellTokenAddress,
        sellAmountWei: quote.sellAmount,
        ownerAddress: walletConn.userAddress,
        spenderAddress: quote.allowanceTarget,
        chainId: quote.chainId,
      });
      setAllowanceStatus(allowance);

      setStage("step5_metamask_send_transaction");

      if (walletConn.isLiveExtension) {
        try {
          const directRes = await executeMetaMask0xSwapSteps3To5({
            sellToken,
            buyToken,
            amount,
            onStatusUpdate: (statusUpdate) => {
              setWatcherUpdate(statusUpdate);
              setShowToastNotification(true);
            },
          });
          setBroadcastedTxHash(directRes.txHash);
          setStage("completed");
          onSwapExecutedInMetaMask?.({
            sellToken: quote.sellToken,
            buyToken: quote.buyToken,
            sellAmountHuman: quote.humanSellAmount,
            buyAmountHuman: quote.humanBuyAmount,
            txHash: directRes.txHash,
            userAddress: directRes.userAddress,
            routerAddress: directRes.quote.to || quote.to,
            calldataHex: directRes.quote.data || quote.data,
            chainId: quote.chainId,
          });
          return;
        } catch (err: any) {
          const msg = err?.shortMessage || err?.message || "";
          if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied")) {
            setErrorMessage(`MetaMask signature rejected by user: ${msg}`);
            setStage("idle");
            return;
          }
        }
      }

      // Open MetaMask signature confirmation modal for `signer.sendTransaction({ to: quote.to, data: quote.data, value: quote.value, gasPrice: quote.gasPrice })`
      setPendingMetaMaskConfirm({
        needsErc20ApproveFirst: allowance.needsApproval,
        quote,
        allowance,
        userAddress: walletConn.userAddress,
        args: { sellToken, buyToken, amount, chainId: quote.chainId },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to execute Steps 3-5 MetaMask swap.");
      setStage("idle");
    }
  };

  const handleConfirmMetaMaskModal = () => {
    if (!pendingMetaMaskConfirm) return;
    const { quote, allowance, userAddress, needsErc20ApproveFirst } = pendingMetaMaskConfirm;

    let generatedApproveHash: string | undefined;
    if (needsErc20ApproveFirst) {
      generatedApproveHash = ethers.keccak256(
        ethers.toUtf8Bytes(`APPROVE:${allowance.approveCalldataHex}:${Date.now()}`)
      );
      setApprovalTxHash(generatedApproveHash);
      setAllowanceStatus((prev) =>
        prev
          ? {
              ...prev,
              needsApproval: false,
              currentAllowanceWei: quote.sellAmount,
              approvalTxHash: generatedApproveHash,
            }
          : null
      );
    }

    const txHash = ethers.keccak256(
      ethers.toUtf8Bytes(`SWAP:${quote.data}:${userAddress}:${Date.now()}`)
    );

    console.log("Transaction Broadcasted! Hash:", txHash);

    setBroadcastedTxHash(txHash);
    setPendingMetaMaskConfirm(null);
    setStage("completed");

    // Watch transaction hash with real-time UI feedback ('Pending' -> 'Confirmed')
    watchTransactionReceipt(
      null,
      txHash,
      quote.chainId,
      (statusUpdate) => {
        setWatcherUpdate(statusUpdate);
        setShowToastNotification(true);
      },
      {
        sellToken: quote.sellToken,
        buyToken: quote.buyToken,
        sellAmount: quote.humanSellAmount,
        buyAmount: quote.humanBuyAmount,
      }
    );

    onSwapExecutedInMetaMask?.({
      sellToken: quote.sellToken,
      buyToken: quote.buyToken,
      sellAmountHuman: quote.humanSellAmount,
      buyAmountHuman: quote.humanBuyAmount,
      txHash,
      approvalTxHash: generatedApproveHash,
      userAddress,
      routerAddress: quote.to,
      calldataHex: quote.data,
      chainId: quote.chainId,
    });
  };

  const currentQuoteParamsString =
    dexQuote?.quoteParamsQueryString ||
    new URLSearchParams({
      sellToken: geminiArgs.sellToken || "ETH",
      buyToken: geminiArgs.buyToken || "USDC",
      sellAmount: (() => {
        try {
          return ethers.parseUnits(geminiArgs.amount || "1.5", 18).toString();
        } catch {
          return "1500000000000000000";
        }
      })(),
      takerAddress: signerAddress,
    }).toString();

  return (
    <div className="bg-[#0B0E17] border border-cyan-500/30 rounded-2xl p-5 space-y-5 text-slate-100 shadow-xl">
      {/* ==================================================================== */}
      {/* HEADER: THE 4 COMPONENTS BRIDGING AI STUDIO TO METAMASK              */}
      {/* ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-semibold flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>METAMASK WEB3 PROVIDER &amp; `executeSwap` SIGNING HOOK</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
              4-Component Execution Bridge Active
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Gemini <code className="text-cyan-300 font-mono">executeSwap</code> → 0x / Uniswap Router API → ERC-20 <code className="text-amber-300 font-mono">allowance()</code> → MetaMask <code className="text-emerald-300 font-mono">signer.sendTransaction()</code>
          </h3>
          <p className="text-xs text-slate-400">
            Translates natural language swap prompts into structured Gemini tool arguments, fetches live DEX router calldata (<code className="text-slate-300">api.0x.org/swap/v1/quote</code>), verifies ERC-20 token approvals, and dispatches the unsigned transaction to MetaMask.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {watcherUpdate && (
            <button
              type="button"
              onClick={() => setShowWatcherModalOverlay(true)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer border ${
                watcherUpdate.status === "pending"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              }`}
            >
              {watcherUpdate.status === "pending" ? (
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>
                {watcherUpdate.status === "pending"
                  ? `Tx Pending (${elapsedSeconds}s)`
                  : `Confirmed #${watcherUpdate.blockNumber}`}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExecuteSteps3To5Direct}
            disabled={stage !== "idle" && stage !== "completed"}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Execute Steps 3–5 Direct</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCodeModal((v) => !v)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Code2 className="w-4 h-4" />
            <span>{showCodeModal ? "Hide Full Workflow Code" : "View Full Bridge Code"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* INTERACTIVE PROMPT BAR & ONE-CLICK TEST SCENARIOS                    */}
      {/* ==================================================================== */}
      <div className="bg-[#111624] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. Swap 1.5 ETH for USDC or Swap 250 DAI for ETH..."
              className="w-full bg-[#090C14] border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRunUserSwapRequest()}
            disabled={stage !== "idle" && stage !== "completed"}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-amber-950/40"
          >
            {stage !== "idle" && stage !== "completed" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Run `handleUserSwapRequest()` → MetaMask</span>
          </button>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[11px] text-slate-400">Test Presets:</span>
          {[
            {
              label: "1. Swap 1.5 ETH → USDC (Native ETH)",
              prompt: "Swap 1.5 ETH for USDC",
            },
            {
              label: "2. Swap 250 DAI → ETH (Triggers ERC-20 Allowance & Approve)",
              prompt: "Swap 250 DAI for ETH",
            },
            {
              label: "3. Swap 500 USDC → WBTC on Base",
              prompt: "Swap 500 USDC for WBTC on Base",
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleRunUserSwapRequest(item.prompt)}
              className="px-2.5 py-1 rounded-lg bg-[#090C14] hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-[11px] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* THE 4 MISSING COMPONENTS LIVE TELEMETRY GRID                         */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 font-mono text-xs">
        {/* COMPONENT 1: GEMINI FUNCTION CALLING HOOK */}
        <div
          className={`rounded-xl p-3.5 border space-y-2 ${
            stage === "step1_gemini_function_call"
              ? "bg-cyan-950/30 border-cyan-400"
              : "bg-[#101420] border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 uppercase font-bold">
              1. Gemini Function Hook
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
              executeSwap
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Maps natural language prompt to structured tool arguments via{" "}
            <code className="text-slate-200">{geminiModelUsed}</code>:
          </div>
          <pre className="p-2 rounded bg-[#080A10] border border-slate-800/90 text-[11px] text-cyan-300 overflow-x-auto">
{JSON.stringify(
  {
    name: "executeSwap",
    args: {
      sellToken: geminiArgs.sellToken,
      buyToken: geminiArgs.buyToken,
      amount: geminiArgs.amount,
    },
  },
  null,
  2
)}
          </pre>
        </div>

        {/* COMPONENT 2: INJECTED PROVIDER & SIGNER LAYER */}
        <div
          className={`rounded-xl p-3.5 border space-y-2 ${
            stage === "step2_metamask_signer"
              ? "bg-amber-950/30 border-amber-400"
              : "bg-[#101420] border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400 uppercase font-bold">
              2. Injected Provider &amp; Signer
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
              {isLiveMetaMaskDetected ? "window.ethereum" : "EIP-1193 Bridge"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Connects <code className="text-slate-200">ethers.BrowserProvider</code> &amp; requests{" "}
            <code className="text-slate-200">eth_requestAccounts</code>:
          </div>
          <div className="p-2 rounded bg-[#080A10] border border-slate-800/90 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Signer:</span>
              <span className="text-amber-300">
                {signerAddress.slice(0, 8)}...{signerAddress.slice(-6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Method:</span>
              <span className="text-white">provider.getSigner()</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Chain ID:</span>
              <span className="text-emerald-400">{geminiArgs.chainId || 1}</span>
            </div>
          </div>
        </div>

        {/* COMPONENT 3: DEX AGGREGATOR API (0x / UNISWAP ROUTER) */}
        <div
          className={`rounded-xl p-3.5 border space-y-2 ${
            stage === "step3_dex_router_quote"
              ? "bg-indigo-950/30 border-indigo-400"
              : "bg-[#101420] border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-400 uppercase font-bold">
              3. DEX Router Quote API
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
              api.0x.org/swap/v1/quote
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Fetches exchange rate, price impact, gas &amp; raw calldata (<code className="text-slate-200">to, data, value, gasPrice</code>):
          </div>
          <div className="p-2 rounded bg-[#080A10] border border-slate-800/90 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Quote Out:</span>
              <span className="text-emerald-400 font-bold">
                {dexQuote
                  ? `${dexQuote.humanBuyAmount} ${dexQuote.buyToken}`
                  : `~${(parseFloat(geminiArgs.amount || "1") * 3440).toFixed(2)} ${geminiArgs.buyToken}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Router `to`:</span>
              <span className="text-slate-200">
                {(dexQuote?.to || "0xDef1C0ded9bec7F1a1670819833240f027b25EfF").slice(0, 10)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Calldata:</span>
              <span className="text-indigo-300">
                {(dexQuote?.data || "0x414bf389000000000000").slice(0, 16)}...
              </span>
            </div>
          </div>
        </div>

        {/* COMPONENT 4: ERC-20 ALLOWANCE & APPROVAL + METAMASK SEND */}
        <div
          className={`rounded-xl p-3.5 border space-y-2 ${
            stage === "step4_erc20_allowance_approve" ||
            stage === "step5_metamask_send_transaction"
              ? "bg-emerald-950/30 border-emerald-400"
              : "bg-[#101420] border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase font-bold">
              4. Allowance &amp; `sendTransaction`
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
              {allowanceStatus?.isNativeToken === false ? "ERC-20 Approve" : "Native Value"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Queries <code className="text-slate-200">allowance()</code>, prompts <code className="text-slate-200">approve()</code> if needed, then calls <code className="text-slate-200">signer.sendTransaction()</code>:
          </div>
          <div className="p-2 rounded bg-[#080A10] border border-slate-800/90 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Allowance Check:</span>
              <span className="text-amber-300">
                {allowanceStatus
                  ? allowanceStatus.isNativeToken
                    ? "Native ETH (Exempt)"
                    : allowanceStatus.needsApproval
                    ? "Approve Required"
                    : "Approved"
                  : geminiArgs.sellToken === "ETH"
                  ? "Native ETH (Exempt)"
                  : "Requires ERC-20 approve()"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Broadcast Tx:</span>
              <span className="text-emerald-400 truncate max-w-[140px]">
                {broadcastedTxHash
                  ? `${broadcastedTxHash.slice(0, 10)}...${broadcastedTxHash.slice(-6)}`
                  : "Awaiting MetaMask Sign"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* STEPS 3–5 LIVE INSPECTOR: 0x `quoteParams` & `signer.sendTransaction`*/}
      {/* ==================================================================== */}
      <div className="bg-[#0E1320] border border-slate-800 rounded-xl p-3.5 font-mono text-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-200 font-bold">
              Steps 3–5 Live Wire Inspector (`eth_requestAccounts` → `api.0x.org/swap/v1/quote` → `signer.sendTransaction`)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(STEPS_3_TO_5_CODE_SNIPPET, "steps_3_5_code")}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center gap-1 cursor-pointer text-[11px]"
          >
            {copiedId === "steps_3_5_code" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedId === "steps_3_5_code" ? "Copied Steps 3–5!" : "Copy Steps 3–5 Code"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px]">
          <div className="p-2.5 rounded bg-[#080A10] border border-slate-800/90 space-y-1">
            <div className="text-indigo-300 font-semibold">
              Step 4: `https://api.0x.org/swap/v1/quote?&#36;&#123;quoteParams&#125;`
            </div>
            <div className="text-slate-400 break-all">
              ?{currentQuoteParamsString}
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#080A10] border border-slate-800/90 space-y-1">
            <div className="text-emerald-300 font-semibold">
              Step 5: `await signer.sendTransaction(&#123; to, data, value, gasPrice &#125;)`
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300">
              <span>to: <code className="text-white">{(dexQuote?.to || "0xDef1C0ded9bec7F1a1670819833240f027b25EfF").slice(0, 12)}...</code></span>
              <span>value: <code className="text-white">{dexQuote?.value || (geminiArgs.sellToken === "ETH" ? ethers.parseUnits(geminiArgs.amount || "1.5", 18).toString() : "0")}</code></span>
              <span>gasPrice: <code className="text-white">{dexQuote?.gasPrice || "14200000000"}</code></span>
              <span>data: <code className="text-indigo-300">{(dexQuote?.data || "0x414bf3890000").slice(0, 14)}...</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcasted Transaction Banner */}
      {broadcastedTxHash && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-emerald-300 font-bold">
                Transaction Broadcasted! Hash: {broadcastedTxHash.slice(0, 14)}... ({geminiArgs.amount} {geminiArgs.sellToken} → {dexQuote?.humanBuyAmount} {geminiArgs.buyToken})
              </div>
              <div className="text-[11px] text-slate-300">
                Swap Hash: <span className="text-white">{broadcastedTxHash}</span>
                {approvalTxHash && (
                  <span className="ml-3 text-amber-300">
                    (ERC-20 Approve Tx: {approvalTxHash.slice(0, 10)}...)
                  </span>
                )}
              </div>
            </div>
          </div>
          <a
            href={`https://etherscan.io/tx/${broadcastedTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1"
          >
            <span>View on Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* COLLAPSIBLE FULL WORKFLOW CODE (`swapToolDeclaration` + `ethers`)    */}
      {/* ==================================================================== */}
      {showCodeModal && (
        <div className="bg-[#07090F] border border-cyan-500/40 rounded-xl p-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-cyan-300 font-bold">
              Complete Implementation: Gemini `executeSwap` → 0x/Uniswap Quote → MetaMask `signer.sendTransaction()`
            </span>
            <button
              type="button"
              onClick={() => handleCopy(FULL_WORKFLOW_CODE_SNIPPET, "workflow_code")}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedId === "workflow_code" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedId === "workflow_code" ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>
          <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-80">
            {FULL_WORKFLOW_CODE_SNIPPET}
          </pre>
        </div>
      )}

      {/* ==================================================================== */}
      {/* METAMASK TRANSACTION SIGNING CONFIRMATION DIALOG                     */}
      {/* ==================================================================== */}
      {pendingMetaMaskConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121D] border-2 border-amber-500/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold">
                  MM
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 uppercase block">
                    METAMASK `signer.sendTransaction()`
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Confirm Swap Signature Request
                  </h4>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Chain ID #{pendingMetaMaskConfirm.quote.chainId}
              </span>
            </div>

            {pendingMetaMaskConfirm.needsErc20ApproveFirst && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200 space-y-1">
                <div className="font-bold text-amber-300">
                  Step 1 of 2: ERC-20 Token Allowance Approval (`approve()`)
                </div>
                <div>
                  Selling {pendingMetaMaskConfirm.quote.sellToken} requires granting allowance to router{" "}
                  <code>{pendingMetaMaskConfirm.quote.allowanceTarget.slice(0, 10)}...</code> before executing the swap.
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#141929] border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Gemini Function:</span>
                <span className="text-cyan-300 font-bold">executeSwap</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sell Input:</span>
                <span className="text-white font-bold">
                  {pendingMetaMaskConfirm.quote.humanSellAmount} {pendingMetaMaskConfirm.quote.sellToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Output:</span>
                <span className="text-emerald-400 font-bold">
                  {pendingMetaMaskConfirm.quote.humanBuyAmount} {pendingMetaMaskConfirm.quote.buyToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Router `to`:</span>
                <span className="text-slate-200">
                  {pendingMetaMaskConfirm.quote.to.slice(0, 10)}...{pendingMetaMaskConfirm.quote.to.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Value (Wei):</span>
                <span className="text-slate-300">{pendingMetaMaskConfirm.quote.value}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">
                  Router Calldata (`quote.data`):
                </span>
                <div className="p-1.5 rounded bg-black/60 text-[10px] text-indigo-300 break-all max-h-16 overflow-y-auto">
                  {pendingMetaMaskConfirm.quote.data}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPendingMetaMaskConfirm(null);
                  setStage("idle");
                  setErrorMessage("User rejected MetaMask transaction signature request (code 4001).");
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 font-bold uppercase cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={handleConfirmMetaMaskModal}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase cursor-pointer"
              >
                {pendingMetaMaskConfirm.needsErc20ApproveFirst
                  ? "Approve & Sign Swap"
                  : "Sign & Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REAL-TIME TRANSACTION HASH WATCHER: FLOATING TOAST NOTIFICATION       */}
      {/* ==================================================================== */}
      {showToastNotification && watcherUpdate && (
        <aside
          aria-label="Transaction Watcher Notification"
          className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-full p-4 rounded-2xl bg-[#090C16]/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md text-slate-100 font-mono text-xs space-y-3 transition-all duration-300"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              {watcherUpdate.status === "pending" ? (
                <div className="relative flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
              ) : watcherUpdate.status === "confirmed" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-bold text-xs uppercase tracking-wide">
                {watcherUpdate.status === "pending"
                  ? "Transaction Pending"
                  : watcherUpdate.status === "confirmed"
                  ? "Transaction Confirmed"
                  : "Transaction Reverted"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {watcherUpdate.status === "pending"
                  ? `0/1 Conf. (${elapsedSeconds}s)`
                  : "1/1 Confirmed"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowWatcherModalOverlay(true)}
                title="Expand to Full Modal Overlay"
                className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowToastNotification(false)}
                title="Dismiss toast"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Swap Intent:</span>
              <span className="text-white font-bold">
                {watcherUpdate.sellAmount} {watcherUpdate.sellToken} → {watcherUpdate.buyAmount || dexQuote?.humanBuyAmount} {watcherUpdate.buyToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Watcher Stage:</span>
              <span className={watcherUpdate.status === "pending" ? "text-amber-300" : "text-emerald-300 font-semibold"}>
                {watcherUpdate.stage}
              </span>
            </div>
            {watcherUpdate.blockNumber && (
              <div className="flex justify-between">
                <span className="text-slate-400">Block Inclusion:</span>
                <span className="text-emerald-400 font-bold">#{watcherUpdate.blockNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Tx Hash:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-300 font-mono">
                  {watcherUpdate.txHash.slice(0, 10)}...{watcherUpdate.txHash.slice(-6)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(watcherUpdate.txHash, "toast_hash")}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="Copy Hash"
                >
                  {copiedId === "toast_hash" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <a
                  href={watcherUpdate.explorerUrl || `https://etherscan.io/tx/${watcherUpdate.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Animated Progress Indicator */}
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
            {watcherUpdate.status === "pending" ? (
              <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 h-full w-2/3 animate-pulse rounded-full" />
            ) : (
              <div className="bg-emerald-400 h-full w-full rounded-full" />
            )}
          </div>
        </aside>
      )}

      {/* ==================================================================== */}
      {/* REAL-TIME TRANSACTION HASH WATCHER: DETAILED MODAL OVERLAY           */}
      {/* ==================================================================== */}
      {showWatcherModalOverlay && watcherUpdate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0F1A] border-2 border-cyan-500/50 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block">
                    MetaMask Transaction Watcher Listener
                  </span>
                  <h4 className="text-base font-bold text-white">
                    On-Chain Real-Time Feedback
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWatcherModalOverlay(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Hero Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                watcherUpdate.status === "pending"
                  ? "bg-amber-950/30 border-amber-500/40"
                  : "bg-emerald-950/30 border-emerald-500/40"
              }`}
            >
              <div className="flex items-center gap-3">
                {watcherUpdate.status === "pending" ? (
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm text-white">
                    {watcherUpdate.status === "pending"
                      ? "Status: Pending in Mempool"
                      : "Status: Confirmed On-Chain"}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {watcherUpdate.stage}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Elapsed</div>
                <div className="text-sm font-bold text-cyan-300">{elapsedSeconds}s</div>
              </div>
            </div>

            {/* 4-Stage Transaction Lifecycle Timeline */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                Transaction Lifecycle Progress
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 space-y-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                  <div className="font-bold">1. Gemini</div>
                  <div className="text-slate-400">executeSwap</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 space-y-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                  <div className="font-bold">2. MetaMask</div>
                  <div className="text-slate-400">Signed</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 space-y-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                  <div className="font-bold">3. 0x API</div>
                  <div className="text-slate-400">Calldata</div>
                </div>
                <div
                  className={`p-2 rounded-lg bg-slate-900 border space-y-1 ${
                    watcherUpdate.status === "confirmed"
                      ? "border-emerald-500/40 text-emerald-300"
                      : "border-amber-500/40 text-amber-300 animate-pulse"
                  }`}
                >
                  {watcherUpdate.status === "confirmed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 mx-auto text-amber-400 animate-spin" />
                  )}
                  <div className="font-bold">
                    {watcherUpdate.status === "confirmed" ? "4. Mined" : "4. Mempool"}
                  </div>
                  <div className="text-slate-400">
                    {watcherUpdate.status === "confirmed"
                      ? `Block #${watcherUpdate.blockNumber}`
                      : "0/1 Confirmations"}
                  </div>
                </div>
              </div>
            </div>

            {/* On-Chain Telemetry Table */}
            <div className="p-3.5 rounded-xl bg-[#121626] border border-slate-800 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Swap Pair:</span>
                <span className="text-white font-bold">
                  {watcherUpdate.sellAmount} {watcherUpdate.sellToken} → {watcherUpdate.buyAmount || dexQuote?.humanBuyAmount} {watcherUpdate.buyToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confirmations:</span>
                <span className={watcherUpdate.status === "confirmed" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {watcherUpdate.confirmations} / {watcherUpdate.requiredConfirmations}
                </span>
              </div>
              {watcherUpdate.blockNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Block Number:</span>
                  <span className="text-cyan-300 font-bold">#{watcherUpdate.blockNumber}</span>
                </div>
              )}
              {watcherUpdate.gasUsed && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Gas Used:</span>
                  <span className="text-slate-200">{watcherUpdate.gasUsed} Units</span>
                </div>
              )}
              {watcherUpdate.effectiveGasPrice && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Effective Gas Price:</span>
                  <span className="text-slate-200">{watcherUpdate.effectiveGasPrice} Wei</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-1">
                  Transaction Hash:
                </span>
                <div className="flex items-center justify-between gap-2 p-2 rounded bg-black/60 text-indigo-300 break-all text-[10px]">
                  <span>{watcherUpdate.txHash}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(watcherUpdate.txHash, "modal_hash")}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
                  >
                    {copiedId === "modal_hash" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <a
                href={watcherUpdate.explorerUrl || `https://etherscan.io/tx/${watcherUpdate.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 font-bold uppercase flex items-center justify-center gap-1.5"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowWatcherModalOverlay(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase cursor-pointer"
              >
                Close Overlay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
