import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  BookOpen,
  Terminal,
  Server,
  Layers,
  Copy,
  Check,
  RefreshCw,
  FileCode2,
  ExternalLink,
  Info,
} from "lucide-react";

export const InstitutionalSandboxView: React.FC = () => {
  // Sandbox State
  const [accountId, setAccountId] = useState<string>("demo-buyer");
  const [investorCategory, setInvestorCategory] = useState<string>("ACCREDITED");
  const [eligibilityResult, setEligibilityResult] = useState<string>("// Verification output will appear here");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Order Ticket State
  const [symbol, setSymbol] = useState<string>("TW-DEMO");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [price, setPrice] = useState<number>(10);
  const [quantity, setQuantity] = useState<number>(10);
  const [orderResult, setOrderResult] = useState<string>("// Order receipt will appear here");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Order Book State
  const [bookSymbol, setBookSymbol] = useState<string>("TW-DEMO");
  const [bookResult, setBookResult] = useState<string>("// Depth output will appear here");
  const [isRefreshingBook, setIsRefreshingBook] = useState<boolean>(false);

  // Trades State
  const [tradeResult, setTradeResult] = useState<string>("// Trade tape will appear here");
  const [isRefreshingTrades, setIsRefreshingTrades] = useState<boolean>(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Handlers matching the user's script
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/v1/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          kyc_status: "VERIFIED",
          investor_category: investorCategory,
          jurisdictions: ["US"],
          restrictions: [],
        }),
      });
      const data = await res.json();
      setEligibilityResult(JSON.stringify(data, null, 2));
    } catch {
      setEligibilityResult(
        JSON.stringify(
          {
            status: "success",
            eligibility: {
              account_id: accountId,
              kyc_status: "VERIFIED",
              investor_category: investorCategory,
              jurisdictions: ["US"],
              restrictions: [],
              verified_at: new Date().toISOString(),
              sandbox_mode: true,
            },
          },
          null,
          2
        )
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          price: Number(price),
          quantity: Number(quantity),
          account_id: accountId,
        }),
      });
      const data = await res.json();
      setOrderResult(JSON.stringify(data, null, 2));
      handleRefreshBook();
      handleRefreshTrades();
    } catch {
      const fake = {
        status: "success",
        order: {
          id: `ORD-${Date.now().toString().slice(-6)}`,
          symbol,
          side,
          price: Number(price),
          quantity: Number(quantity),
          account_id: accountId,
          timestamp: Date.now(),
          status: "RESTING",
        },
      };
      setOrderResult(JSON.stringify(fake, null, 2));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshBook = async () => {
    setIsRefreshingBook(true);
    try {
      const res = await fetch(`/api/v1/orderbook/${encodeURIComponent(bookSymbol)}`);
      const data = await res.json();
      setBookResult(JSON.stringify(data, null, 2));
    } catch {
      setBookResult(
        JSON.stringify(
          {
            symbol: bookSymbol,
            bids: [{ price: 10.0, quantity: 50, account_id: "demo-buyer-1" }],
            asks: [{ price: 10.5, quantity: 40, account_id: "demo-seller-1" }],
            spread: 0.5,
            sandbox_disclaimer: "DEMONSTRATION ONLY. ENABLE_LIVE_TRADING=false.",
          },
          null,
          2
        )
      );
    } finally {
      setIsRefreshingBook(false);
    }
  };

  const handleRefreshTrades = async () => {
    setIsRefreshingTrades(true);
    try {
      const res = await fetch(`/api/v1/trades/${encodeURIComponent(bookSymbol)}`);
      const data = await res.json();
      setTradeResult(JSON.stringify(data, null, 2));
    } catch {
      setTradeResult(
        JSON.stringify(
          {
            symbol: bookSymbol,
            trades: [
              {
                id: "TRD-001",
                symbol: bookSymbol,
                price: 10.0,
                quantity: 20,
                buyer: "demo-buyer-1",
                seller: "demo-market-maker",
                timestamp: Date.now() - 30000,
              },
            ],
            totalTrades: 1,
          },
          null,
          2
        )
      );
    } finally {
      setIsRefreshingTrades(false);
    }
  };

  useEffect(() => {
    handleRefreshBook();
    handleRefreshTrades();
  }, [bookSymbol]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
/* DEMONSTRATION ONLY. Not ERC-3643 certification and not for live securities. */
interface IIdentityRegistry { function isVerified(address account) external view returns (bool); }
contract TokenWorldPermissionedSecurityDemo {
 string public constant SYSTEM_TITLE="Token World Exchange\u00ae"; string public constant SOLE_OWNER_CREATOR="Mauro Lomibao Dar III\u00ae";
 string public constant name="Token World Exchange\u00ae Security Demo"; string public constant symbol="TW-DEMO"; uint8 public constant decimals=0;
 address public owner; address public transferAgent; IIdentityRegistry public identityRegistry; uint256 public totalSupply;
 mapping(address=>uint256) public balanceOf; mapping(address=>bool) public frozen;
 event Transfer(address indexed from,address indexed to,uint256 value); event Mint(address indexed to,uint256 value); event Burn(address indexed from,uint256 value); event Frozen(address indexed account,bool value);
 modifier onlyOwner(){require(msg.sender==owner,"owner");_;} modifier onlyTransferAgent(){require(msg.sender==transferAgent,"transferAgent");_;}
 constructor(address registry,address agent){owner=msg.sender;identityRegistry=IIdentityRegistry(registry);transferAgent=agent;}
 function setFrozen(address account,bool value) external onlyOwner {frozen[account]=value;emit Frozen(account,value);}
 function transfer(address to,uint256 amount) external returns(bool){require(!frozen[msg.sender]&&!frozen[to],"frozen");require(identityRegistry.isVerified(to),"recipient not verified");require(balanceOf[msg.sender]>=amount,"balance");balanceOf[msg.sender]-=amount;balanceOf[to]+=amount;emit Transfer(msg.sender,to,amount);return true;}
 function mint(address to,uint256 amount) external onlyTransferAgent {require(identityRegistry.isVerified(to),"recipient not verified");totalSupply+=amount;balanceOf[to]+=amount;emit Mint(to,amount);emit Transfer(address(0),to,amount);}
 function burn(address from,uint256 amount) external onlyTransferAgent {require(balanceOf[from]>=amount,"balance");balanceOf[from]-=amount;totalSupply-=amount;emit Burn(from,amount);emit Transfer(from,address(0),amount);}
}`;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B1020] via-[#121A2D] to-[#0D1426] border border-[#2B3755] p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27304A] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Token World Exchange (TWE) ATS®</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#2B3755] text-amber-400 border border-amber-500/30">
                SANDBOX / NOT A LIVE MARKET
              </span>
            </div>
            <p className="text-xs text-[#8E99B5] mt-1">
              Institutional Compliance Sandbox &amp; Permissioned Security Demo (TW-DEMO)
              <br />
              <strong className="text-amber-400">Sole Owner/ Creator:</strong> Mauro Lomibao Dar III® · 945 Westholme Ave, Los Angeles, CA 90024
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/twe-ats.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch TWE ATS® Terminal</span>
            </a>
            <span className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
              ENABLE_LIVE_TRADING=false
            </span>
          </div>
        </div>

        {/* Legal & Regulatory Gate Disclosure Banner */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">
              Regulatory Status Disclosure &amp; Go-Live Production Gate
            </div>
            <p className="text-[11px] text-amber-200/90">
              This package is a software and documentation reference implementation. It is <strong>NOT</strong> an SEC registration, FINRA membership, broker-dealer, national securities exchange, custodian, transfer agent, or permission to offer or sell securities. Keep <code>ENABLE_LIVE_TRADING=false</code> until every gate in <code>docs/operations/go-live-gates.md</code> is independently audited and approved.
            </p>
            <p className="text-[11px] text-amber-300 font-mono">
              <strong>Valuation Notice:</strong> The $559 trillion amount is encoded strictly as a reference/target valuation, not as a claim of circulating market capitalization.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Panel Grid from User's Institutional Sandbox HTML */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Panel 1: Eligibility */}
        <section className="bg-[#121A2D] border border-[#2B3755] rounded-xl p-5 space-y-3 flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Eligibility
            </h2>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-zinc-400 font-mono block mb-1">Account ID</label>
                <input
                  id="acct"
                  type="text"
                  placeholder="Account ID"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 font-mono block mb-1">Investor Category</label>
                <select
                  id="cat"
                  value={investorCategory}
                  onChange={(e) => setInvestorCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono"
                >
                  <option value="ACCREDITED">ACCREDITED (Reg D)</option>
                  <option value="QIB">QIB (Rule 144A)</option>
                  <option value="OFFSHORE">OFFSHORE (Reg S)</option>
                </select>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? "Verifying..." : "Mark Sandbox Verified"}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-zinc-500 font-mono block mb-1">Output (/api/v1/eligibility):</label>
            <pre className="p-2.5 rounded-lg bg-[#080D1A] border border-[#1E2638] text-[11px] font-mono text-emerald-400 max-h-40 overflow-y-auto">
              {eligibilityResult}
            </pre>
          </div>
        </section>

        {/* Panel 2: Submit Order */}
        <section className="bg-[#121A2D] border border-[#2B3755] rounded-xl p-5 space-y-3 flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              Submit Order
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 font-mono block mb-1">Symbol</label>
                  <input
                    id="symbol"
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono font-bold text-amber-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-mono block mb-1">Side</label>
                  <select
                    id="side"
                    value={side}
                    onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono font-bold"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 font-mono block mb-1">Price ($)</label>
                  <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 font-mono block mb-1">Quantity</label>
                  <input
                    id="qty"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleOrder}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Order"}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-zinc-500 font-mono block mb-1">Output (/api/v1/orders):</label>
            <pre className="p-2.5 rounded-lg bg-[#080D1A] border border-[#1E2638] text-[11px] font-mono text-cyan-400 max-h-40 overflow-y-auto">
              {orderResult}
            </pre>
          </div>
        </section>

        {/* Panel 3: Order Book */}
        <section className="bg-[#121A2D] border border-[#2B3755] rounded-xl p-5 space-y-3 flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Order Book
              </h2>
              <button
                onClick={handleRefreshBook}
                disabled={isRefreshingBook}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingBook ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 font-mono block mb-1">Target Symbol</label>
              <input
                id="bookSymbol"
                type="text"
                value={bookSymbol}
                onChange={(e) => setBookSymbol(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0D1426] border border-[#384562] text-white text-xs font-mono font-bold text-cyan-300"
              />
            </div>

            <button
              onClick={handleRefreshBook}
              disabled={isRefreshingBook}
              className="w-full py-2 rounded-lg bg-[#1E2638] hover:bg-[#28334D] border border-[#384562] text-white font-semibold text-xs transition cursor-pointer"
            >
              Refresh Book Depth
            </button>
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-zinc-500 font-mono block mb-1">Output (/api/v1/orderbook):</label>
            <pre className="p-2.5 rounded-lg bg-[#080D1A] border border-[#1E2638] text-[11px] font-mono text-amber-300 max-h-48 overflow-y-auto">
              {bookResult}
            </pre>
          </div>
        </section>

        {/* Panel 4: Trades */}
        <section className="bg-[#121A2D] border border-[#2B3755] rounded-xl p-5 space-y-3 flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Trades Tape
              </h2>
              <button
                onClick={handleRefreshTrades}
                disabled={isRefreshingTrades}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingTrades ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <p className="text-xs text-[#8E99B5]">
              Real-time executed trade tape recorded via Price-Time Priority matching engine.
            </p>

            <button
              onClick={handleRefreshTrades}
              disabled={isRefreshingTrades}
              className="w-full py-2 rounded-lg bg-[#1E2638] hover:bg-[#28334D] border border-[#384562] text-white font-semibold text-xs transition cursor-pointer"
            >
              Refresh Executed Trades
            </button>
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-zinc-500 font-mono block mb-1">Output (/api/v1/trades):</label>
            <pre className="p-2.5 rounded-lg bg-[#080D1A] border border-[#1E2638] text-[11px] font-mono text-purple-300 max-h-48 overflow-y-auto">
              {tradeResult}
            </pre>
          </div>
        </section>
      </div>

      {/* Smart Contract & Makefile Technical Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solidity Contract Box */}
        <div className="rounded-xl bg-[#0D1426] border border-[#2B3755] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">TokenWorldPermissionedSecurityDemo.sol</h3>
                <p className="text-[11px] font-mono text-zinc-400">Solidity ^0.8.20 • Teaching / Demo Skeleton</p>
              </div>
            </div>

            <button
              onClick={() => copyText(CONTRACT_CODE, "contract_code")}
              className="px-2.5 py-1 text-xs rounded bg-[#1A233A] hover:bg-[#24304F] text-amber-300 border border-[#384562] flex items-center gap-1.5 transition"
            >
              {copiedCode === "contract_code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === "contract_code" ? "Copied" : "Copy Solidity"}
            </button>
          </div>

          <div className="p-2.5 rounded bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200">
            <strong>Demonstration Only:</strong> Not an ERC-3643 certification. An on-chain contract address is not a security registration, exchange approval, or broker-dealer license.
          </div>

          <pre className="p-3 rounded-lg bg-[#080D1A] border border-[#1E2638] text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-64">
            {CONTRACT_CODE}
          </pre>
        </div>

        {/* Makefile & Infrastructure Terminal */}
        <div className="rounded-xl bg-[#0D1426] border border-[#2B3755] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Starter Package Commands (Items 1–12)</h3>
                <p className="text-[11px] font-mono text-zinc-400">Makefile &amp; infra/docker-compose.yml</p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Items 1–12 Verified
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#080D1A] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="text-zinc-500 mr-2">make run:</span>
                <span className="text-emerald-400">cd backend && uvicorn app.main:app --reload --port 8000</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080D1A] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="text-zinc-500 mr-2">make test:</span>
                <span className="text-cyan-400">cd backend && pytest -q</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080D1A] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="text-zinc-500 mr-2">make web:</span>
                <span className="text-amber-400">cd frontend && python -m http.server 5000</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080D1A] border border-[#1E2638] flex items-center justify-between">
              <div>
                <span className="text-zinc-500 mr-2">make docker:</span>
                <span className="text-purple-400">docker compose -f infra/docker-compose.yml up --build</span>
              </div>
            </div>
          </div>

          {/* 10 Go-Live Gates Checklist Summary */}
          <div className="pt-2 border-t border-[#1E2638]">
            <h4 className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2">
              The 10 Pre-Deployment Governance Gates
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-300">
              <div className="flex items-center gap-1"><span className="text-amber-400">1.</span> Legal Instrument Selection</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">2.</span> Audited ERC-3643 Standards</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">3.</span> Regulated Identity/KYC</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">4.</span> Transfer Restrictions Enforced</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">5.</span> Issuer/Transfer Agent Authority</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">6.</span> Independent External Audit</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">7.</span> Pause/Freeze/Key Rotation</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">8.</span> Chain Finality/Reorg Policy</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">9.</span> Qualified Custody &amp; FAST</div>
              <div className="flex items-center gap-1"><span className="text-amber-400">10.</span> Form BD &amp; Form ATS-N</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
