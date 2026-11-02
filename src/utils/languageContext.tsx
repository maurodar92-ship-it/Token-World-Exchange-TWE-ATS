import React, { createContext, useContext, useState, useEffect } from "react";

export type WorldLanguageCode = "en" | "es" | "zh" | "ja" | "de" | "fr" | "ar" | "pt" | "ko" | "hi";

export interface WorldLanguageOption {
  code: WorldLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
  region: string;
}

export const WORLD_LANGUAGES: WorldLanguageOption[] = [
  { code: "en", name: "English", nativeName: "English (US/UK)", flag: "🇺🇸", dir: "ltr", region: "Global / Americas / Europe" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", dir: "ltr", region: "Spain / Latin America" },
  { code: "zh", name: "Chinese", nativeName: "中文 (简体)", flag: "🇨🇳", dir: "ltr", region: "East Asia" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", dir: "ltr", region: "Japan" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", dir: "ltr", region: "Central Europe" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", dir: "ltr", region: "Western Europe / Francophonie" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", dir: "rtl", region: "Middle East / North Africa" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", dir: "ltr", region: "Brazil / Portugal" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", dir: "ltr", region: "South Korea" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", dir: "ltr", region: "India / South Asia" },
];

export const TRANSLATIONS: Record<WorldLanguageCode, Record<string, string>> = {
  en: {
    app_title: "Token World",
    foundry: "Token Foundry",
    weekly_tree3: "Weekly TREE3 Update",
    sandbox: "Institutional Sandbox",
    ats_venue: "ATS & NYSE Venue",
    ai_vision: "AI Vision & Music",
    harmonics: "Harmonics & Hz",
    earn: "Earn & Revenue",
    portfolio: "Wallet Portfolio",
    swap_sell: "Global Swap & Sell",
    public_registry: "Public Registry",
    vault: "Token Vault",
    tokenomics: "2⁸ Tokenomics",
    liquidity_pools: "509 Liquidity Pools",
    all_apps: "75+ Chains",
    connect_metamask: "Enable MetaMask (Secured)",
    fullscreen: "Full Screen",
    exit_fullscreen: "Exit Full Screen",
    glide_settings: "Swift Glide & World Settings",
    glide_up: "Glide Up",
    glide_down: "Glide Down",
    glide_left: "Glide Left",
    glide_right: "Glide Right",
    world_connectivity: "Live World Web Connection",
    status_connected: "World Connected (Real-Time)",
    language: "Language",
    speed: "Glide Speed",
    snappy: "Snappy (150ms)",
    smooth: "Smooth (300ms)",
    cinematic: "Cinematic (600ms)",
    search: "Search tokens, contracts, or symbols...",
    deploy_all: "Deploy All to Market",
    generate_100: "Generate 100 Multi-Chain",
  },
  es: {
    app_title: "Token World",
    foundry: "Fundición de Tokens",
    weekly_tree3: "Actualización Semanal TREE3",
    sandbox: "Entorno Institucional",
    ats_venue: "Sede ATS y NYSE",
    ai_vision: "Visión IA y Música",
    harmonics: "Armónicos y Hz",
    earn: "Monetización e Ingresos",
    portfolio: "Billetera y Portafolio",
    swap_sell: "Intercambio Global (52 Bolsas)",
    public_registry: "Registro Público",
    vault: "Bóveda Segura de Tokens",
    tokenomics: "Tokenomía 2⁸",
    liquidity_pools: "509 Grupos de Liquidez",
    all_apps: "Más de 75 Cadenas",
    connect_metamask: "Conectar MetaMask (Seguro)",
    fullscreen: "Pantalla Completa",
    exit_fullscreen: "Salir de Pantalla Completa",
    glide_settings: "Deslizamiento Rápido y Ajustes Mundiales",
    glide_up: "Deslizar Arriba",
    glide_down: "Deslizar Abajo",
    glide_left: "Deslizar Izquierda",
    glide_right: "Deslizar Derecha",
    world_connectivity: "Conexión Web Mundial en Vivo",
    status_connected: "Mundo Conectado (Tiempo Real)",
    language: "Idioma",
    speed: "Velocidad de Deslizamiento",
    snappy: "Rápido (150ms)",
    smooth: "Fluido (300ms)",
    cinematic: "Cinematográfico (600ms)",
    search: "Buscar tokens, contratos o símbolos...",
    deploy_all: "Desplegar Todos al Mercado",
    generate_100: "Generar 100 Multicadena",
  },
  zh: {
    app_title: "Token World",
    foundry: "代币铸造工厂",
    weekly_tree3: "TREE3 每周通报",
    sandbox: "机构合规沙盒",
    ats_venue: "ATS 与纽交所交易场",
    ai_vision: "AI 视觉与音乐中心",
    harmonics: "神圣谐波与赫兹",
    earn: "收益与商业变现",
    portfolio: "钱包投资组合",
    swap_sell: "全球 52 交易所闪兑",
    public_registry: "公共合约注册表",
    vault: "持久代币金库",
    tokenomics: "2⁸ 代币经济学",
    liquidity_pools: "509 个流动性池",
    all_apps: "75+ 公链生态",
    connect_metamask: "启用 MetaMask (安全连接)",
    fullscreen: "全屏模式",
    exit_fullscreen: "退出全屏",
    glide_settings: "敏捷滑动与全球设置",
    glide_up: "向上滑动",
    glide_down: "向下滑动",
    glide_left: "向左滑动",
    glide_right: "向右滑动",
    world_connectivity: "全球互联网实时互联",
    status_connected: "全球实时互联中",
    language: "核心主流语言",
    speed: "滑动速度",
    snappy: "快速 (150ms)",
    smooth: "平滑 (300ms)",
    cinematic: "影院级 (600ms)",
    search: "搜索代币、合约或代码...",
    deploy_all: "全部部署至市场",
    generate_100: "批量生成 100 个多链代币",
  },
  ja: {
    app_title: "Token World",
    foundry: "トークン・ファウンドリ",
    weekly_tree3: "週刊 TREE3 進捗報告",
    sandbox: "機関向けサンドボックス",
    ats_venue: "ATS & NYSE 取引所",
    ai_vision: "AI ビジョン & 音楽",
    harmonics: "調和周波数 & Hz",
    earn: "収益ハブ",
    portfolio: "ウォレットポートフォリオ",
    swap_sell: "世界52取引所スワップ",
    public_registry: "公開コントラクト台帳",
    vault: "トークン・ヴォールト",
    tokenomics: "2⁸ トークノミクス",
    liquidity_pools: "509 流動性プール",
    all_apps: "75+ ブロックチェーン",
    connect_metamask: "MetaMask を有効化 (保護済)",
    fullscreen: "全画面表示",
    exit_fullscreen: "全画面を終了",
    glide_settings: "高速スライド & 世界設定",
    glide_up: "上へスライド",
    glide_down: "下へスライド",
    glide_left: "左へスライド",
    glide_right: "右へスライド",
    world_connectivity: "ワールド・ワイド・ウェブ接続",
    status_connected: "世界接続完了 (リアルタイム)",
    language: "言語選択",
    speed: "スライド速度",
    snappy: "機敏 (150ms)",
    smooth: "滑らか (300ms)",
    cinematic: "シネマティック (600ms)",
    search: "トークン、コントラクトを検索...",
    deploy_all: "全市場へ展開",
    generate_100: "100 マルチチェーン生成",
  },
  de: {
    app_title: "Token World",
    foundry: "Token-Gießerei",
    weekly_tree3: "Wöchentliches TREE3-Update",
    sandbox: "Institutionelle Sandbox",
    ats_venue: "ATS & NYSE Handelsplatz",
    ai_vision: "KI-Vision & Musik",
    harmonics: "Heilige Harmonik & Hz",
    earn: "Ertrag & Einnahmen",
    portfolio: "Wallet-Portfolio",
    swap_sell: "Globaler Tausch (52 Börsen)",
    public_registry: "Öffentliches Vertragsregister",
    vault: "Token-Tresor",
    tokenomics: "2⁸ Tokenomics",
    liquidity_pools: "509 Liquiditätspools",
    all_apps: "75+ Blockchains",
    connect_metamask: "MetaMask aktivieren (Gesichert)",
    fullscreen: "Vollbildmodus",
    exit_fullscreen: "Vollbild beenden",
    glide_settings: "Schnellgleit- & Welteinstellungen",
    glide_up: "Nach oben gleiten",
    glide_down: "Nach unten gleiten",
    glide_left: "Nach links gleiten",
    glide_right: "Nach rechts gleiten",
    world_connectivity: "Echtzeit-Webverbindung zur Welt",
    status_connected: "Weltweit verbunden (Echtzeit)",
    language: "Sprache",
    speed: "Gleitgeschwindigkeit",
    snappy: "Knackig (150ms)",
    smooth: "Sanft (300ms)",
    cinematic: "Filmisch (600ms)",
    search: "Tokens oder Verträge suchen...",
    deploy_all: "Alle im Markt bereitstellen",
    generate_100: "100 Multi-Chain generieren",
  },
  fr: {
    app_title: "Token World",
    foundry: "Fonderie de Jetons",
    weekly_tree3: "Rapport Hebdomadaire TREE3",
    sandbox: "Bac à Sable Institutionnel",
    ats_venue: "Lieu ATS & NYSE",
    ai_vision: "Vision IA & Musique",
    harmonics: "Harmoniques & Hz",
    earn: "Revenus & Monétisation",
    portfolio: "Portefeuille Crypto",
    swap_sell: "Échange Mondial (52 Bourses)",
    public_registry: "Registre Public des Contrats",
    vault: "Coffre-fort de Jetons",
    tokenomics: "Tokenomics 2⁸",
    liquidity_pools: "509 Pools de Liquidité",
    all_apps: "75+ Blockchains",
    connect_metamask: "Activer MetaMask (Sécurisé)",
    fullscreen: "Plein Écran",
    exit_fullscreen: "Quitter le Plein Écran",
    glide_settings: "Glissement Rapide & Paramètres Mondiaux",
    glide_up: "Glisser vers le Haut",
    glide_down: "Glisser vers le Bas",
    glide_left: "Glisser vers la Gauche",
    glide_right: "Glisser vers la Droite",
    world_connectivity: "Connexion Web Mondiale en Direct",
    status_connected: "Connecté au Monde (Temps Réel)",
    language: "Langue",
    speed: "Vitesse de Glissement",
    snappy: "Rapide (150ms)",
    smooth: "Fluide (300ms)",
    cinematic: "Cinématographique (600ms)",
    search: "Rechercher jetons, adresses...",
    deploy_all: "Déployer Tout sur le Marché",
    generate_100: "Générer 100 Multi-Chaînes",
  },
  ar: {
    app_title: "عالم الرموز (Token World)",
    foundry: "مسبك الرموز",
    weekly_tree3: "تحديث أسبوعي لـ TREE3",
    sandbox: "بيئة الاختبار المؤسسية",
    ats_venue: "منصة ATS و NYSE المزدوجة",
    ai_vision: "رؤية الذكاء الاصطناعي والموسيقى",
    harmonics: "الترددات المقدسة وهيرتز",
    earn: "مركز الإيرادات والأرباح",
    portfolio: "محفظة الأصول",
    swap_sell: "التبادل العالمي (52 بورصة)",
    public_registry: "السجل العام للعقود",
    vault: "خزينة الرموز المشفرة",
    tokenomics: "اقتصاديات الرموز 2⁸",
    liquidity_pools: "509 مجمعات سيولة",
    all_apps: "أكثر من 75 سلسلة كتل",
    connect_metamask: "تفعيل ميتاماسك (آمن)",
    fullscreen: "ملء الشاشة",
    exit_fullscreen: "إنهاء ملء الشاشة",
    glide_settings: "إعدادات الانزلاق السريع والعالم",
    glide_up: "انزلاق للأعلى",
    glide_down: "انزلاق للأسفل",
    glide_left: "انزلاق لليسار",
    glide_right: "انزلاق لليمين",
    world_connectivity: "اتصال حي بشبكة الويب العالمية",
    status_connected: "متصل بالعالم (في الوقت الحقيقي)",
    language: "اللغة الرئيسية",
    speed: "سرعة الانزلاق",
    snappy: "سريع (150ms)",
    smooth: "سلس (300ms)",
    cinematic: "سينمائي (600ms)",
    search: "ابحث عن الرموز والعقود...",
    deploy_all: "نشر الكل في السوق",
    generate_100: "توليد 100 رمز متعدد السلاسل",
  },
  pt: {
    app_title: "Token World",
    foundry: "Fundição de Tokens",
    weekly_tree3: "Atualização Semanal TREE3",
    sandbox: "Sandbox Institucional",
    ats_venue: "Mercado ATS e NYSE",
    ai_vision: "Visão IA e Música",
    harmonics: "Harmônicos e Hz",
    earn: "Receita e Monetização",
    portfolio: "Carteira e Portfólio",
    swap_sell: "Troca Global (52 Bolsas)",
    public_registry: "Registro Público de Contratos",
    vault: "Cofre de Tokens",
    tokenomics: "Tokenomics 2⁸",
    liquidity_pools: "509 Pools de Liquidez",
    all_apps: "Mais de 75 Blockchains",
    connect_metamask: "Ativar MetaMask (Protegido)",
    fullscreen: "Tela Cheia",
    exit_fullscreen: "Sair da Tela Cheia",
    glide_settings: "Deslizamento Rápido e Configurações Globais",
    glide_up: "Deslizar para Cima",
    glide_down: "Deslizar para Baixo",
    glide_left: "Deslizar para a Esquerda",
    glide_right: "Deslizar para a Direita",
    world_connectivity: "Conexão Web Mundial em Tempo Real",
    status_connected: "Mundo Conectado (Tempo Real)",
    language: "Idioma",
    speed: "Velocidade de Deslizamento",
    snappy: "Rápido (150ms)",
    smooth: "Suave (300ms)",
    cinematic: "Cinematográfico (600ms)",
    search: "Buscar tokens, contratos...",
    deploy_all: "Implantar Todos no Mercado",
    generate_100: "Gerar 100 Multicadeia",
  },
  ko: {
    app_title: "Token World",
    foundry: "토큰 파운드리",
    weekly_tree3: "주간 TREE3 업데이트",
    sandbox: "기관용 샌드박스",
    ats_venue: "ATS 및 NYSE 거래소",
    ai_vision: "AI 비전 및 음악 허브",
    harmonics: "솔페지오 하모닉스 & Hz",
    earn: "수익 및 결제 허브",
    portfolio: "지갑 포트폴리오",
    swap_sell: "글로벌 52개 거래소 스왑",
    public_registry: "공개 스마트 계약 레지스트리",
    vault: "토큰 볼트 (금고)",
    tokenomics: "2⁸ 토크노믹스 엔진",
    liquidity_pools: "509개 유동성 풀",
    all_apps: "75+ 멀티체인",
    connect_metamask: "MetaMask 활성화 (보안됨)",
    fullscreen: "전체 화면",
    exit_fullscreen: "전체 화면 종료",
    glide_settings: "초고속 슬라이드 & 글로벌 설정",
    glide_up: "위로 슬라이드",
    glide_down: "아래로 슬라이드",
    glide_left: "왼쪽으로 슬라이드",
    glide_right: "오른쪽으로 슬라이드",
    world_connectivity: "월드 와이드 웹 실시간 연결",
    status_connected: "글로벌 실시간 연결됨",
    language: "세계 주요 언어",
    speed: "슬라이드 속도",
    snappy: "경쾌함 (150ms)",
    smooth: "부드러움 (300ms)",
    cinematic: "시네마틱 (600ms)",
    search: "토큰, 컨트랙트, 심볼 검색...",
    deploy_all: "전체 마켓 배포",
    generate_100: "멀티체인 100개 생성",
  },
  hi: {
    app_title: "टोकन वर्ल्ड (Token World)",
    foundry: "टोकन फाउंड्री",
    weekly_tree3: "साप्ताहिक TREE3 अपडेट",
    sandbox: "संस्थागत सैंडबॉक्स",
    ats_venue: "ATS और NYSE वेन्यू",
    ai_vision: "एआई विजन और संगीत",
    harmonics: "हार्मोनिक्स और हर्ट्ज",
    earn: "कमाई और राजस्व हब",
    portfolio: "वॉलेट पोर्टफोलियो",
    swap_sell: "ग्लोबल 52 एक्सचेंज स्वैप",
    public_registry: "सार्वजनिक अनुबंध रजिस्ट्री",
    vault: "टोकन वॉल्ट",
    tokenomics: "2⁸ टोकनॉमिक्स",
    liquidity_pools: "509 लिक्विडिटी पूल",
    all_apps: "75+ ब्लॉकचेन नेटवर्क",
    connect_metamask: "मेटामास्क सक्षम करें (सुरक्षित)",
    fullscreen: "फुल स्क्रीन",
    exit_fullscreen: "फुल स्क्रीन से बाहर निकलें",
    glide_settings: "स्विफ्ट ग्लाइड और वर्ल्ड सेटिंग्स",
    glide_up: "ऊपर ग्लाइड करें",
    glide_down: "नीचे ग्लाइड करें",
    glide_left: "बाएं ग्लाइड करें",
    glide_right: "दाएं ग्लाइड करें",
    world_connectivity: "वर्ल्ड वाइड वेब कनेक्टिविटी",
    status_connected: "विश्व कनेक्टेड (रीयल-टाइम)",
    language: "भाषा",
    speed: "ग्लाइड गति",
    snappy: "तेज़ (150ms)",
    smooth: "चिकना (300ms)",
    cinematic: "सिनेमैटिक (600ms)",
    search: "टोकन, अनुबंध या प्रतीक खोजें...",
    deploy_all: "सभी को मार्केट में तैनात करें",
    generate_100: "100 मल्टी-चेन बनाएं",
  },
};

interface LanguageContextType {
  currentLanguage: WorldLanguageCode;
  setLanguage: (lang: WorldLanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languageConfig: WorldLanguageOption;
  availableLanguages: WorldLanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "tokenworld_world_language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<WorldLanguageCode>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && WORLD_LANGUAGES.some((l) => l.code === stored)) {
        return stored as WorldLanguageCode;
      }
      // Auto-detect browser language if matches our core languages
      if (typeof navigator !== "undefined" && navigator.language) {
        const prefix = navigator.language.slice(0, 2).toLowerCase();
        if (WORLD_LANGUAGES.some((l) => l.code === prefix)) {
          return prefix as WorldLanguageCode;
        }
      }
    } catch {
      // Ignore
    }
    return "en";
  });

  const languageConfig = WORLD_LANGUAGES.find((l) => l.code === currentLanguage) || WORLD_LANGUAGES[0];

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = languageConfig.dir;
    } catch {
      // Ignore
    }
  }, [currentLanguage, languageConfig]);

  const setLanguage = (lang: WorldLanguageCode) => {
    setCurrentLanguageState(lang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    if (dict && dict[key]) {
      return dict[key];
    }
    if (TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        languageConfig,
        availableLanguages: WORLD_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
