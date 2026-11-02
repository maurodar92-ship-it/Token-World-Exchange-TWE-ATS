import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DeviceViewportMode = 'desktop' | 'tablet' | 'mobile' | 'side_by_side';

export type ShowroomModuleId = 
  | 'trading' 
  | 'sec_monitor' 
  | 'discount_center' 
  | 'hsm_security' 
  | 'architecture_pillars';

export interface SyncedOrder {
  id: string;
  timestamp: string;
  deviceOrigin: 'Web Workstation' | 'Mobile Native iOS/Android' | 'Tablet Pro';
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET' | 'STOP_COLLAR';
  qty: number;
  price: number;
  totalUsd: number;
  status: 'PENDING' | 'ATOMIC_SETTLED_T0' | 'ROUTED_SOR';
  txHash: string;
  biometricVerified: boolean;
  hsmKeyId: string;
  iso20022Ref: string;
}

export interface Iso20022Message {
  id: string;
  messageType: 'pacs.008.001.10' | 'camt.053.001.10' | 'auth.030.001.02' | 'pain.001.001.11';
  name: string;
  timestamp: string;
  senderBic: string;
  receiverBic: string;
  settlementAmountUsd: number;
  payloadXmlSnippet: string;
  complianceRule: string;
}

interface ShowroomSyncContextType {
  deviceMode: DeviceViewportMode;
  setDeviceMode: (mode: DeviceViewportMode) => void;
  activeModule: ShowroomModuleId;
  setActiveModule: (mod: ShowroomModuleId) => void;
  syncedOrders: SyncedOrder[];
  isoMessages: Iso20022Message[];
  latencyMs: number;
  isStreamActive: boolean;
  biometricActive: boolean;
  triggerBiometricAuth: () => Promise<boolean>;
  submitCrossDeviceOrder: (order: Partial<SyncedOrder>) => SyncedOrder;
  simulateMobileTradePush: () => void;
  lastSyncedTimestamp: string;
}

const ShowroomSyncContext = createContext<ShowroomSyncContextType | undefined>(undefined);

const SEED_ORDERS: SyncedOrder[] = [
  {
    id: 'ord_sync_101',
    timestamp: new Date(Date.now() - 35000).toLocaleTimeString(),
    deviceOrigin: 'Mobile Native iOS/Android',
    symbol: 'TWE',
    side: 'BUY',
    orderType: 'LIMIT',
    qty: 2500,
    price: 1.85,
    totalUsd: 4625.0,
    status: 'ATOMIC_SETTLED_T0',
    txHash: '0x8f3c...b912',
    biometricVerified: true,
    hsmKeyId: 'HSM-YUBIKEY-SEC-01',
    iso20022Ref: 'TWE-ISO-PACS008-8831'
  },
  {
    id: 'ord_sync_102',
    timestamp: new Date(Date.now() - 95000).toLocaleTimeString(),
    deviceOrigin: 'Web Workstation',
    symbol: 'BTC',
    side: 'BUY',
    orderType: 'MARKET',
    qty: 0.75,
    price: 64250.0,
    totalUsd: 48187.5,
    status: 'ATOMIC_SETTLED_T0',
    txHash: '0x44a1...91fe',
    biometricVerified: true,
    hsmKeyId: 'HSM-NITRO-CLOUD-09',
    iso20022Ref: 'TWE-ISO-PACS008-8830'
  },
  {
    id: 'ord_sync_103',
    timestamp: new Date(Date.now() - 180000).toLocaleTimeString(),
    deviceOrigin: 'Tablet Pro',
    symbol: 'ETH',
    side: 'SELL',
    orderType: 'LIMIT',
    qty: 15.0,
    price: 3480.0,
    totalUsd: 52200.0,
    status: 'ROUTED_SOR',
    txHash: '0x17c9...aa03',
    biometricVerified: true,
    hsmKeyId: 'HSM-SECURE-ENCLAVE-02',
    iso20022Ref: 'TWE-ISO-PACS008-8829'
  }
];

const SEED_ISO_MESSAGES: Iso20022Message[] = [
  {
    id: 'iso-001',
    messageType: 'pacs.008.001.10',
    name: 'Financial Institutional Customer Credit Transfer',
    timestamp: new Date().toISOString(),
    senderBic: 'TWEWUS33XXX',
    receiverBic: 'FEDWUS33NYC',
    settlementAmountUsd: 4625.0,
    payloadXmlSnippet: `<FIToFICstmrCdtTrf>\n  <GrpHdr>\n    <MsgId>TWE-2026-PAC008-01</MsgId>\n    <CreDtTm>2026-10-27T12:00:00Z</CreDtTm>\n    <SttlmInf><SttlmMtd>CLRG</SttlmMtd></SttlmInf>\n  </GrpHdr>\n  <CdtTrfTxInf>\n    <IntrBkSttlmAmt Ccy="USD">4625.00</IntrBkSttlmAmt>\n    <SttlmPrty>HIGH</SttlmPrty>\n  </CdtTrfTxInf>\n</FIToFICstmrCdtTrf>`,
    complianceRule: 'SEC Rule 15c3-5 Pre-Trade Risk Collar'
  },
  {
    id: 'iso-002',
    messageType: 'camt.053.001.10',
    name: 'Bank-to-Customer Real-Time Statement & On-Chain Audit',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    senderBic: 'TWEWUS33XXX',
    receiverBic: 'DTCCUS33XXX',
    settlementAmountUsd: 1250000.0,
    payloadXmlSnippet: `<BkToCstmrStmt>\n  <GrpHdr><MsgId>TWE-CAMT053-99</MsgId></GrpHdr>\n  <Stmt>\n    <Id>STMT-2026-ATS</Id>\n    <Acct><Id><IBAN>US89TWEW000018594020</IBAN></Id></Acct>\n    <Bal><Amt Ccy="USD">1250000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd></Bal>\n  </Stmt>\n</BkToCstmrStmt>`,
    complianceRule: 'FINRA Rule 4511 Custody Ledger Synchronization'
  },
  {
    id: 'iso-003',
    messageType: 'auth.030.001.02',
    name: 'SEC / FINRA Alternative Trading System Regulatory Report',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    senderBic: 'TWEWUS33XXX',
    receiverBic: 'SECXUS33WDC',
    settlementAmountUsd: 104812.5,
    payloadXmlSnippet: `<ATSRpt>\n  <RptHdr><VenueId>TWE-ATS</VenueId><Operator>Mauro Lomibao Dar III</Operator></RptHdr>\n  <ExctnRpt>\n    <FinInstrmId>TWE-TOKEN-RWA</FinInstrmId>\n    <ExctnQty>2500</ExctnQty>\n    <SttlmType>T_PLUS_ZERO_ATOMIC</SttlmType>\n  </ExctnRpt>\n</ATSRpt>`,
    complianceRule: 'SEC Regulation ATS Rule 301(b) Audit Filing'
  }
];

export const ShowroomSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceMode, setDeviceMode] = useState<DeviceViewportMode>('desktop');
  const [activeModule, setActiveModule] = useState<ShowroomModuleId>('trading');
  const [syncedOrders, setSyncedOrders] = useState<SyncedOrder[]>(SEED_ORDERS);
  const [isoMessages, setIsoMessages] = useState<Iso20022Message[]>(SEED_ISO_MESSAGES);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [isStreamActive, setIsStreamActive] = useState<boolean>(true);
  const [biometricActive, setBiometricActive] = useState<boolean>(true);
  const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<string>(new Date().toLocaleTimeString());

  // Micro-latency jitter simulation for institutional telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setLatencyMs(prev => Math.max(8, Math.min(18, prev + Math.floor(Math.random() * 5 - 2))));
      setLastSyncedTimestamp(new Date().toLocaleTimeString());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const triggerBiometricAuth = async (): Promise<boolean> => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(true);
      }, 700);
    });
  };

  const submitCrossDeviceOrder = (orderData: Partial<SyncedOrder>): SyncedOrder => {
    const newOrder: SyncedOrder = {
      id: `ord_sync_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      deviceOrigin: orderData.deviceOrigin || 'Mobile Native iOS/Android',
      symbol: orderData.symbol || 'TWE',
      side: orderData.side || 'BUY',
      orderType: orderData.orderType || 'LIMIT',
      qty: orderData.qty || 1000,
      price: orderData.price || 1.85,
      totalUsd: orderData.totalUsd || 1850,
      status: 'ATOMIC_SETTLED_T0',
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('').slice(0, 10)}...`,
      biometricVerified: true,
      hsmKeyId: 'HSM-YUBIKEY-SEC-01',
      iso20022Ref: `TWE-ISO-PACS008-${Math.floor(1000 + Math.random() * 9000)}`
    };

    setSyncedOrders(prev => [newOrder, ...prev]);

    // Create companion ISO 20022 message
    const newIso: Iso20022Message = {
      id: `iso-${Date.now()}`,
      messageType: 'pacs.008.001.10',
      name: `Cross-Device Credit Transfer (${newOrder.symbol})`,
      timestamp: new Date().toISOString(),
      senderBic: 'TWEWUS33XXX',
      receiverBic: 'FEDWUS33NYC',
      settlementAmountUsd: newOrder.totalUsd,
      payloadXmlSnippet: `<FIToFICstmrCdtTrf>\n  <GrpHdr><MsgId>${newOrder.iso20022Ref}</MsgId></GrpHdr>\n  <TxInf><Amt Ccy="USD">${newOrder.totalUsd.toFixed(2)}</Amt><Org>${newOrder.deviceOrigin}</Org></TxInf>\n</FIToFICstmrCdtTrf>`,
      complianceRule: 'SEC Rule 15c3-5 Pre-Trade Risk Collar'
    };

    setIsoMessages(prev => [newIso, ...prev]);
    return newOrder;
  };

  const simulateMobileTradePush = () => {
    const symbols = ['TWE', 'BTC', 'ETH', 'SOL'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const price = sym === 'TWE' ? 1.85 : sym === 'BTC' ? 64280 : sym === 'ETH' ? 3490 : 185;
    const qty = sym === 'TWE' ? 5000 : sym === 'BTC' ? 0.5 : sym === 'ETH' ? 5 : 40;
    submitCrossDeviceOrder({
      deviceOrigin: 'Mobile Native iOS/Android',
      symbol: sym,
      side: 'BUY',
      orderType: 'LIMIT',
      qty,
      price,
      totalUsd: Number((qty * price).toFixed(2))
    });
  };

  return (
    <ShowroomSyncContext.Provider
      value={{
        deviceMode,
        setDeviceMode,
        activeModule,
        setActiveModule,
        syncedOrders,
        isoMessages,
        latencyMs,
        isStreamActive,
        biometricActive,
        triggerBiometricAuth,
        submitCrossDeviceOrder,
        simulateMobileTradePush,
        lastSyncedTimestamp
      }}
    >
      {children}
    </ShowroomSyncContext.Provider>
  );
};

export const useShowroomSync = (): ShowroomSyncContextType => {
  const context = useContext(ShowroomSyncContext);
  if (!context) {
    throw new Error('useShowroomSync must be used within a ShowroomSyncProvider');
  }
  return context;
};
