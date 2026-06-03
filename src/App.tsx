/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, SlidersHorizontal, Download, RefreshCw, Trash2, 
  Edit3, CheckCircle2, ChevronRight, X, Heart, Sparkles, Filter, 
  TrendingUp, CircleDollarSign, Coins, ArrowUpRight, BarChart3,
  CalendarDays, Tag, ClipboardList, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Article, ArticleStatus, KPIMetrics } from './types';
import { INITIAL_ARTICLES, CATEGORIES } from './mockData';
import { calculateMetrics, getArticleDetails, exportToCsv, formatEur, formatPercent, generatePlaceholderSvg, formatLocalDate } from './utils';
import WhoopRing from './components/WhoopRing';
import ArticleForm from './components/ArticleForm';
import LedgerCharts from './components/LedgerCharts';

export default function App() {
  // --- Persistent State ---
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('vinted_ledger_articles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing cached articles: ', e);
      }
    }
    // Load pre-populated articles and compute placeholders if empty
    return INITIAL_ARTICLES.map(art => ({
      ...art,
      image: art.image || generatePlaceholderSvg(art.name, art.category)
    }));
  });

  // Sync state to localStorage on modification
  useEffect(() => {
    try {
      localStorage.setItem('vinted_ledger_articles', JSON.stringify(articles));
    } catch (e) {
      console.error('Error writing to localStorage: ', e);
      addToast('Speicherlimit erreicht! Bild- oder Artikelgröße minimiert.', 'error');
    }
  }, [articles]);

  // --- Filtering & UI Controls ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Alle' | ArticleStatus>('Alle');
  const [categoryFilter, setCategoryFilter] = useState('Alle');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // --- Modals State ---
  const [formArticle, setFormArticle] = useState<Article | null | undefined>(undefined); // undefined = hidden, null = new, Article = edit
  const [soldArticle, setSoldArticle] = useState<Article | null>(null); // Quick "Mark as sold" trigger
  const [deleteArticle, setDeleteArticle] = useState<Article | null>(null); // Quick delete trigger
  const [showResetConfirm, setShowResetConfirm] = useState(false); // Clean iframe reset modal

  // --- Sold Modal Inputs ---
  const [soldPriceInput, setSoldPriceInput] = useState<number>(0);
  const [soldFeesInput, setSoldFeesInput] = useState<number>(0);
  const [soldDateInput, setSoldDateInput] = useState<string>('');

  // --- Toast Notifications ---
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: 'success' | 'info' | 'error' }[]>([]);

  const addToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Prepopulate sold inputs whenever article is selected
  useEffect(() => {
    if (soldArticle) {
      setSoldPriceInput(soldArticle.sellingPrice || 0);
      setSoldFeesInput(soldArticle.fees || 0);
      setSoldDateInput(new Date().toISOString().split('T')[0]);
    }
  }, [soldArticle]);

  // --- Core CRUD Handlers ---
  const handleSaveArticle = (savedArt: Article) => {
    const isEdit = articles.some(art => art.id === savedArt.id);
    
    if (isEdit) {
      setArticles(prev => prev.map(art => art.id === savedArt.id ? savedArt : art));
      addToast(`„${savedArt.name}“ erfolgreich aktualisiert!`, 'success');
    } else {
      setArticles(prev => [savedArt, ...prev]);
      addToast(`„${savedArt.name}“ erfasst und eingeplant!`, 'success');
    }
    
    setFormArticle(undefined); // Close modal
  };

  const handleDeleteArticle = () => {
    if (!deleteArticle) return;
    setArticles(prev => prev.filter(art => art.id !== deleteArticle.id));
    addToast(`„${deleteArticle.name}“ gelöscht.`, 'error');
    setDeleteArticle(null);
  };

  const handleMarkAsSoldConfirm = () => {
    if (!soldArticle) return;
    
    const updated: Article = {
      ...soldArticle,
      status: 'Verkauft',
      sellingPrice: soldPriceInput,
      fees: soldFeesInput,
      saleDate: soldDateInput || new Date().toISOString().split('T')[0]
    };

    setArticles(prev => prev.map(art => art.id === soldArticle.id ? updated : art));
    addToast(`„${soldArticle.name}“ als verkauft markiert! (+${(soldPriceInput - soldArticle.purchasePrice - soldFeesInput).toFixed(2)}€ Gewinn)`, 'success');
    setSoldArticle(null);
  };

  const handleResetToSample = () => {
    const resetArticles = INITIAL_ARTICLES.map(art => ({
      ...art,
      image: art.image || generatePlaceholderSvg(art.name, art.category)
    }));
    setArticles(resetArticles);
    addToast('Datenbestand erfolgreich zurückgesetzt.', 'info');
    setShowResetConfirm(false);
  };

  const handleExportCsv = () => {
    try {
      const csvContent = exportToCsv(articles);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Vinted_Flip_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Buchhaltungsdaten als CSV Datei exportiert!', 'success');
    } catch (e) {
      addToast('Fehler beim CSV Export.', 'error');
    }
  };

  // --- Calculations & KPI Aggregations ---
  const metrics = useMemo(() => calculateMetrics(articles), [articles]);

  const totalExpenses = useMemo(() => {
    return articles.reduce((sum, art) => sum + art.purchasePrice + (art.fees || 0), 0);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles
      .filter(art => {
        const matchesSearch = 
          art.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (art.notes && art.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === 'Alle' || art.status === statusFilter;
        const matchesCategory = categoryFilter === 'Alle' || art.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        const detailA = getArticleDetails(a);
        const detailB = getArticleDetails(b);

        switch (sortBy) {
          case 'date-desc': {
            const timeA = new Date(a.purchaseDate).getTime();
            const timeB = new Date(b.purchaseDate).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          }
          case 'date-asc': {
            const timeA = new Date(a.purchaseDate).getTime();
            const timeB = new Date(b.purchaseDate).getTime();
            return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
          }
          case 'profit-desc':
            return detailB.profit - detailA.profit;
          case 'roi-desc':
            return detailB.roi - detailA.roi;
          case 'price-asc':
            return a.purchasePrice - b.purchasePrice;
          case 'price-desc':
            return b.purchasePrice - a.purchasePrice;
          default:
            return 0;
        }
      });
  }, [articles, searchQuery, statusFilter, categoryFilter, sortBy]);

  const totalROIColor = metrics.totalProfit >= 0 ? 'text-[#00E676]' : 'text-rose-500';
  const totalROIColorGlow = metrics.totalProfit >= 0 ? 'rgba(0, 230, 118, 0.45)' : 'rgba(244, 63, 94, 0.45)';

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0A0A0B] text-neutral-100 font-sans tracking-normal relative selection:bg-[#00E676] selection:text-black">
      
      {/* Absolute Ambient Background Lights (Frosted Glass Neon Theme) */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#00E676] opacity-[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#00E676] opacity-[0.03] rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header Bar */}
      <header className="border-b border-white/10 bg-[#0E0E10]/80 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00E676] to-[#009688] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.3)] relative group">
              <TrendingUp className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-sm md:text-md font-black font-space tracking-[0.25em] text-white">
                VINTED <span className="font-serif italic font-normal text-[#00E676] tracking-normal lower-case">flip</span> LEDGER
              </h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Buchhaltung & Reselling Dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setFormArticle(null)}
              className="px-4 py-2 bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-black rounded-xl transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(0,230,118,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Flips Erfassen</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
        
        {/* --- SECTION 1: OVERALL STATUS (HERO INDICATOR) --- */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Hero left description card of whole system plus/minus */}
          <div className="md:col-span-8 bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            
            {/* Top glass lighting highlights */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute -top-12 left-10 w-48 h-40 bg-[#00E676]/[0.02] rounded-full blur-3xl pointer-events-none" />

            {/* Title / Description */}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 bg-white/[0.03] border border-white/10 rounded-full px-3 py-1">
                <Sparkles className="w-3.5 h-3.5 text-[#00E676]" />
                <span className="text-[10px] text-neutral-300 tracking-widest uppercase font-mono">Live Business Score</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black font-space tracking-tight text-white leading-tight">
                Ihr Portfolio steht <br />
                <span className="font-serif italic font-normal text-[#00E676] capitalize">
                  {metrics.totalProfit >= 0 ? 'hervorragend im Plus' : 'derzeit leicht unter Druck'}
                </span>
              </h2>
              <p className="text-sm text-neutral-400 max-w-lg mt-2">
                Echtzeit-Analyse Ihres Vinted reselling Portfolios. Integriert alle erfassten Artikel (verkauft, inseriert und auf Lager), um eine akkurate Performance-Leistung zu errechnen.
              </p>
            </div>

            {/* Total Return Percent Display */}
            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="space-y-1">
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest font-mono">Gesamt-Rendite (Alle)</p>
                <div className="flex items-baseline space-x-1.5">
                  <span 
                    className="text-4xl font-black tracking-tight font-sans"
                    style={{ 
                      color: metrics.totalProfit >= 0 ? '#00E676' : '#f43f5e',
                      textShadow: `0 0 24px ${totalROIColorGlow}`
                    }}
                  >
                    {metrics.averageROI >= 0 ? '+' : ''}{metrics.averageROI.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Strategisches Gesamtkapital</p>
              </div>

              <div className="space-y-1 border-white/10 sm:border-l sm:pl-6">
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest font-mono flex items-center gap-1">
                  Realisierte Rendite
                  <span className="text-[9px] bg-[#00E676]/10 text-[#00E676] px-1 py-px rounded border border-[#00E676]/20">Verkauft</span>
                </p>
                <div className="flex items-baseline space-x-1.5 text-white">
                  <span className="text-2xl font-black tracking-tight font-mono">
                    {metrics.realizedROI >= 0 ? '+' : ''}{metrics.realizedROI.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Nur realisierte Abgänge</p>
              </div>

              <div className="space-y-1 border-white/10 sm:border-l sm:pl-6">
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest font-mono flex items-center gap-1">
                  Prognostizierte Rendite
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1 py-px rounded border border-indigo-500/20">Aktiv</span>
                </p>
                <div className="flex items-baseline space-x-1.5 text-white">
                  <span className="text-2xl font-black tracking-tight font-mono">
                    {metrics.projectedROI >= 0 ? '+' : ''}{metrics.projectedROI.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">Für inseriert & Lagerbestand</p>
              </div>

            </div>

          </div>

          {/* Hero right Circular Progress Ring */}
          <div className="md:col-span-4 flex flex-col justify-between">
            <WhoopRing
              percentage={metrics.averageROI}
              profit={metrics.totalProfit}
              isPositive={metrics.totalProfit >= 0}
              label={metrics.totalProfit >= 0 ? 'Im Profit-Plus' : 'Im Verlust-Minus'}
            />
          </div>

        </section>

        {/* --- SECTION 2: METRIC TILE BLOCKS --- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Tile 1: Profit (Gewinn) */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex flex-col justify-between relative group hover:border-[#00E676]/30 transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[10px] font-bold tracking-widest uppercase font-mono">Profit (Gewinn)</span>
              <TrendingUp className="w-4 h-4 text-[#00E676]" />
            </div>
            <div className="mt-2">
              <h3 
                className="text-xl md:text-2xl font-black font-mono tracking-tight"
                style={{ color: metrics.totalProfit >= 0 ? '#00E676' : '#f43f5e' }}
              >
                {metrics.totalProfit >= 0 ? '+' : ''}{formatEur(metrics.totalProfit)}
              </h3>
              <p className="text-[10px] text-neutral-500 uppercase mt-1">Netto-Gesamtbilanz</p>
            </div>
          </div>

          {/* Tile 2: Umsatz */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex flex-col justify-between relative group hover:border-[#00E676]/30 transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[10px] font-bold tracking-widest uppercase font-mono">Umsatz</span>
              <CircleDollarSign className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="mt-2">
              <h3 className="text-xl md:text-2xl font-black font-mono text-white tracking-tight">
                {formatEur(metrics.totalRevenueRealized)}
              </h3>
              <p className="text-[10px] text-neutral-500 uppercase mt-1">Aus {metrics.countSold} Verkäufen</p>
            </div>
          </div>

          {/* Tile 3: Ausgaben */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex flex-col justify-between relative group hover:border-rose-500/30 transition-all duration-300">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-[10px] font-bold tracking-widest uppercase font-mono">Ausgaben</span>
              <Coins className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <h3 className="text-xl md:text-2xl font-black font-mono text-neutral-200 tracking-tight">
                {formatEur(totalExpenses)}
              </h3>
              <p className="text-[10px] text-neutral-500 uppercase mt-1">Kaufpreis & Gebühren gesamt</p>
            </div>
          </div>

          {/* Tile 4: Bester Artikel */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex flex-col justify-between relative group hover:border-[#00E676]/30 transition-all duration-300 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[10px] font-bold tracking-widest uppercase font-mono text-[#00E676] flex items-center gap-1">
                <Heart className="w-3 h-3 fill-[#00E676]" /> Bester Flip
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#00E676]" />
            </div>
            {metrics.bestArticle ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="truncate max-w-[170px]">
                  <h4 className="text-xs md:text-sm font-bold text-white truncate">{metrics.bestArticle.name}</h4>
                  <p className="text-[10px] text-neutral-500 truncate mt-0.5 uppercase tracking-wide">{metrics.bestArticle.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black font-mono text-[#00E676]">
                    +{getArticleDetails(metrics.bestArticle).profit.toFixed(0)}€
                  </p>
                  <p className="text-[9px] font-mono text-neutral-400">
                    {getArticleDetails(metrics.bestArticle).roi.toFixed(0)}% ROI
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500">Bisher keine Artikel vorhanden.</div>
            )}
          </div>

        </section>

        {/* --- SECTION 3: RECHARTS GRAPHICAL CHARTS --- */}
        <section>
          <LedgerCharts articles={articles} />
        </section>

        {/* --- SECTION 4: INVENTORY / INVENTAR (SEARCH, FILTERS, DATA VIS) --- */}
        <section className="space-y-6">
          
          {/* Main Controls Panel */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-4 md:p-5 shadow-2xl space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-md font-black text-white tracking-widest uppercase font-sans">Mein Warenbestand</h3>
                <p className="text-xs text-neutral-500">Verwalten, filtern und aktualisieren Sie Ihre Vinted Inventarposten</p>
              </div>

              {/* Grid or Table layout toggle */}
              <div className="flex items-center space-x-1 p-1 bg-neutral-900 border border-white/[0.04] rounded-xl self-start">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    viewMode === 'grid' 
                      ? 'bg-[#00E676] text-black shadow-[0_0_12px_rgba(0,230,118,0.25)]' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Card Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    viewMode === 'table' 
                      ? 'bg-[#00E676] text-black shadow-[0_0_12px_rgba(0,230,118,0.25)]' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Tabelle
                </button>
              </div>
            </div>

            {/* Filter Sliders and Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-white/10">
              
              {/* Search input field */}
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Suche nach Name, Notiz, Sparte..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-neutral-200 text-xs focus:border-[#00E676]/50 outline-none transition-all placeholder:text-neutral-600 font-sans"
                />
              </div>

              {/* Status Select */}
              <div className="md:col-span-3 flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-mono hidden xl:inline">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-neutral-300 outline-none cursor-pointer focus:border-[#00E676]/50"
                >
                  <option value="Alle" className="bg-[#111114]">📦 Alle Statusse</option>
                  <option value="Auf Lager" className="bg-[#111114]">🔥 Auf Lager</option>
                  <option value="Inseriert" className="bg-[#111114]">🏷️ Inseriert</option>
                  <option value="Verkauft" className="bg-[#111114]">🤝 Verkauft</option>
                </select>
              </div>

              {/* Category Select */}
              <div className="md:col-span-2 flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-mono hidden xl:inline">Rubrik:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-neutral-300 outline-none cursor-pointer focus:border-[#00E676]/50"
                >
                  <option value="Alle" className="bg-[#111114]">👕 Alle Kategorien</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-[#111114]">{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort Select */}
              <div className="md:col-span-3 flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-mono hidden xl:inline">Reihe:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-neutral-300 outline-none cursor-pointer focus:border-[#00E676]/50"
                >
                  <option value="date-desc" className="bg-[#111114]">Kaufdatum: Neueste</option>
                  <option value="date-asc" className="bg-[#111114]">Kaufdatum: Älteste</option>
                  <option value="profit-desc" className="bg-[#111114]">Gewinn: Höchster zuerst</option>
                  <option value="roi-desc" className="bg-[#111114]">Rendite (ROI): Höchste</option>
                  <option value="price-asc" className="bg-[#111114]">Einkauf: Günstigste</option>
                  <option value="price-desc" className="bg-[#111114]">Einkauf: Teuerste</option>
                </select>
              </div>

            </div>

          </div>

          {/* Render Inventory items */}
          <AnimatePresence mode="popLayout">
            {filteredArticles.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#111114]/80 backdrop-blur-xl border border-dashed border-white/10 rounded-[24px] p-12 text-center text-neutral-500 max-w-md mx-auto"
              >
                <div className="p-4 bg-white/5 rounded-full inline-block mb-3 border border-white/10">
                  <Filter className="w-6 h-6 text-neutral-400 opacity-60" />
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Keine Ergebnisse gefunden</h4>
                <p className="text-xs text-neutral-500 mb-4 px-4">
                  Passen Sie Ihre Such- oder Filterkriterien an, um Ihre Vinted Flips einzusehen.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('Alle');
                    setCategoryFilter('Alle');
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-xs font-semibold text-neutral-300 rounded-lg transition-all cursor-pointer backdrop-blur-xs"
                >
                  Filter zurücksetzen
                </button>
              </motion.div>
            ) : viewMode === 'grid' ? (
              
              // GRID VIEW - Strict 4:5 Aspect ratio card mesh
              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {filteredArticles.map(art => {
                  const { profit, roi } = getArticleDetails(art);
                  const isSold = art.status === 'Verkauft';
                  const isListed = art.status === 'Inseriert';
                  
                  return (
                    <motion.div
                       layout
                      key={art.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -6 }}
                      transition={{ duration: 0.25, type: 'tween' }}
                      className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 hover:border-[#00E676]/30 rounded-[24px] overflow-hidden shadow-2xl flex flex-col justify-between relative group transition-all duration-300"
                    >
                      
                      {/* Image section in strict 4:5 aspect ratio */}
                      <div className="relative aspect-[4/5] w-full bg-neutral-950 overflow-hidden">
                        <img
                          src={art.image}
                          alt={art.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 ease-out select-none"
                        />
                        
                        {/* Overlays on image: top dark blend & bottom dark blend */}
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-neutral-950/80 to-transparent pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-neutral-950/90 to-transparent pointer-events-none" />

                        {/* Top-left: Category tag badge */}
                        <span className="absolute top-4 left-4 text-[9px] uppercase tracking-widest bg-neutral-900/80 px-2.5 py-1 rounded-full border border-white/10 font-mono font-bold text-neutral-300 backdrop-blur-md">
                          {art.category}
                        </span>

                        {/* Top-right: Status icon badge */}
                        <span className={`absolute top-4 right-4 text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-full border font-mono font-bold backdrop-blur-md ${
                          isSold 
                            ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20' 
                            : isListed 
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                              : 'bg-neutral-500/10 text-neutral-300 border-neutral-500/20'
                        }`}>
                          {art.status}
                        </span>

                        {/* Hover triggers row for actions - appears absolute middle */}
                        <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2.5 z-10 backdrop-blur-xs">
                          {/* edit */}
                          <button
                            onClick={() => setFormArticle(art)}
                            className="p-2.5 bg-[#141416]/90 border border-white/5 hover:border-white/20 text-neutral-300 hover:text-white rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                            title="Artikel bearbeiten"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          {/* Complete sale quickly */}
                          {!isSold && (
                            <button
                              onClick={() => setSoldArticle(art)}
                              className="p-2.5 bg-[#00E676] text-black hover:bg-[#00c853] rounded-xl transition-all cursor-pointer font-extrabold hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,230,118,0.35)]"
                              title="Als verkauft markieren"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* delete */}
                          <button
                            onClick={() => setDeleteArticle(art)}
                            className="p-2.5 bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                      {/* Info & Metrics section */}
                      <div className="p-4 md:p-5 flex flex-col justify-between flex-1 space-y-4">
                        
                        {/* Title block */}
                        <div>
                          <h4 className="text-white text-sm font-bold truncate line-clamp-1 group-hover:text-[#00E676] transition-all">
                            {art.name}
                          </h4>
                          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide mt-1">
                            Gekauft am {formatLocalDate(art.purchaseDate, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        {/* Interactive price calculations grids */}
                        <div className="grid grid-cols-2 gap-2 border-t border-b border-white/10 py-3 text-xs font-mono">
                          
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest block">Einkauf</span>
                            <span className="text-neutral-200 font-bold">{formatEur(art.purchasePrice)}</span>
                          </div>

                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest block">
                              {isSold ? 'Verkaufspreis' : 'Inseriert'}
                            </span>
                            <span className="text-neutral-200 font-bold">{formatEur(art.sellingPrice)}</span>
                          </div>

                        </div>

                        {/* Real-time ROI results display row */}
                        <div className="flex items-center justify-between">
                          
                          <div>
                            <span className="text-[8px] text-neutral-500 uppercase font-bold block tracking-wider font-mono">
                              {isSold ? 'Realisierter Gewinn' : 'Erwarteter Gewinn'}
                            </span>
                            <span className={`text-base font-black font-mono leading-none ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-400'}`}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}€
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[8px] text-neutral-500 uppercase font-bold block tracking-wider font-mono">ROI / Rendite</span>
                            <span className={`text-sm font-black font-mono leading-none ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-400'}`}>
                              {profit >= 0 ? '+' : ''}{roi.toFixed(1)}%
                            </span>
                          </div>

                        </div>

                        {/* Note snippet if exists at bottom */}
                        {art.notes && (
                          <div className="text-[10px] text-neutral-500 italic truncate py-1.5 px-2 bg-black/40 rounded-lg max-w-full border border-white/5">
                            „{art.notes}“
                          </div>
                        )}

                        {/* Fast mobile control bar if not hover (visible for easy use) */}
                        <div className="flex sm:hidden items-center justify-between pt-1 text-xs border-t border-white/10">
                          <button 
                            type="button"
                            onClick={() => setFormArticle(art)}
                            className="text-neutral-400 hover:text-white"
                          >
                            Bearbeiten
                          </button>
                          
                          {!isSold && (
                            <button 
                              type="button"
                              onClick={() => setSoldArticle(art)}
                              className="text-[#00E676] font-bold"
                            >
                              Als verkauft eintragen
                            </button>
                          )}

                          <button 
                            type="button"
                            onClick={() => setDeleteArticle(art)}
                            className="text-neutral-500 hover:text-rose-400"
                          >
                            Löschen
                          </button>
                        </div>

                      </div>

                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              
              // TABLE VIEW - Bookkeeping dense data sheets
              <motion.div 
                layout
                className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden shadow-2xl"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-black/40 text-neutral-400 text-[10px] uppercase tracking-widest font-mono font-bold border-b border-white/10 select-none">
                        <th className="py-4 px-5">Artikel</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4 font-mono">Einkauf (€)</th>
                        <th className="py-4 px-4 font-mono">Verkauf (€)</th>
                        <th className="py-4 px-4 font-mono">Gebühren (€)</th>
                        <th className="py-4 px-4 font-mono">Gewinn (€)</th>
                        <th className="py-4 px-4 font-mono">ROI</th>
                        <th className="py-4 px-4">Erfasst am</th>
                        <th className="py-4 px-5 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredArticles.map(art => {
                        const { profit, roi } = getArticleDetails(art);
                        const isSold = art.status === 'Verkauft';
                        
                        return (
                          <tr 
                            key={art.id} 
                            className="text-xs hover:bg-white/5 transition-colors"
                          >
                            {/* Product thumb + title */}
                            <td className="py-3 px-5 flex items-center space-x-3.5 max-w-xs">
                              <div className="w-9 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                                <img 
                                  src={art.image} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-white truncate hover:text-[#00E676] transition-all">{art.name}</p>
                                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">{art.category}</span>
                              </div>
                            </td>
                            
                            {/* Status badge */}
                            <td className="py-3 px-4">
                              <span className={`inline-block text-[9px] uppercase px-2 py-0.5 rounded-full border ${
                                isSold 
                                  ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20' 
                                  : art.status === 'Inseriert' 
                                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                                    : 'bg-neutral-500/10 text-neutral-300 border-neutral-500/20'
                              } font-mono font-bold`}>
                                {art.status}
                              </span>
                            </td>

                            {/* Prices with monospace styling for clean numerical layout */}
                            <td className="py-3 px-4 font-mono font-medium text-neutral-300">{art.purchasePrice.toFixed(2)}</td>
                            <td className="py-3 px-4 font-mono font-medium text-neutral-300">{art.sellingPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 font-mono text-neutral-500">{art.fees.toFixed(2)}</td>
                            <td className={`py-3 px-4 font-mono font-bold ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-400'}`}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 font-mono font-bold ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-400'}`}>
                              {profit >= 0 ? '+' : ''}{roi.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-500">
                              {formatLocalDate(art.purchaseDate, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </td>

                            {/* Actions buttons */}
                            <td className="py-3 px-5 text-right space-x-1">
                              {!isSold && (
                                <button
                                  onClick={() => setSoldArticle(art)}
                                  className="p-1 px-2.5 bg-[#00E676]/10 hover:bg-[#00E676]/20 hover:text-[#00E676] text-[#00E676] border border-[#00E676]/20 rounded-lg transition-all cursor-pointer text-[10px] font-black"
                                  title="Als verkauft markieren"
                                >
                                  Verkauft
                                </button>
                              )}
                              <button
                                onClick={() => setFormArticle(art)}
                                className="p-1 bg-white/5 hover:bg-white/10 hover:border-white/15 border border-white/5 text-neutral-400 hover:text-white rounded-lg transition-all cursor-pointer"
                                title="Bearbeiten"
                              >
                                <Edit3 className="w-3.5 h-3.5 inline" />
                              </button>
                              <button
                                onClick={() => setDeleteArticle(art)}
                                className="p-1 bg-[#f43f5e]/10 border border-[#f43f5e]/10 hover:bg-[#f43f5e]/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                                title="Löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>

            )}
          </AnimatePresence>

        </section>

      </main>

      {/* --- SIDE-MODAL / PANEL: ADD/EDIT FORM (Slide-In right overlay) --- */}
      <AnimatePresence>
        {formArticle !== undefined && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormArticle(undefined)}
              className="absolute inset-0 bg-[#050506]/90 backdrop-blur-md cursor-pointer"
            />
            
            {/* Slide-out modal container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-[#111114]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-6 md:p-8 flex flex-col"
            >
              {/* Close Button top-left absolute */}
              <button
                onClick={() => setFormArticle(undefined)}
                className="absolute top-6 right-6 p-2 bg-white/5 border border-white/10 hover:border-white/15 text-neutral-400 hover:text-white rounded-xl cursor-pointer backdrop-blur-xs transition-all z-30"
              >
                <X className="w-4 h-4" />
              </button>

              <ArticleForm
                article={formArticle}
                onSave={handleSaveArticle}
                onCancel={() => setFormArticle(undefined)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QUICK MODAL: MARK AS SOLD (Scale and Fade) --- */}
      <AnimatePresence>
        {soldArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSoldArticle(null)}
              className="absolute inset-0 bg-[#050506]/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#111114]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[24px] p-6 max-w-md w-full overflow-hidden z-10"
            >
              {/* Soft ambient lighting inside the modal */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00E676]/20 to-transparent" />
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#00E676]/[0.015] rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 rounded-xl bg-[#00E676]/10 border border-[#00E676]/20 text-[#00E676]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-black text-white uppercase tracking-wider font-sans">Erlös abschließen</h3>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono mt-0.5">Flip erfolgreich protokollieren</p>
                </div>
              </div>

              <div className="mb-4 bg-black/40 p-3.5 rounded-xl border border-white/5 flex items-center space-x-3 text-xs">
                <div className="w-8 h-10 rounded overflow-hidden shrink-0">
                  <img src={soldArticle.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-white line-clamp-1">{soldArticle.name}</h4>
                  <p className="text-neutral-500 font-mono mt-0.5">Einkaufspreis: {soldArticle.purchasePrice.toFixed(2)} €</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col space-y-1">
                  <label htmlFor="sold-price" className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Verkaufspreis (€) *</label>
                  <input
                    id="sold-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={soldPriceInput}
                    onChange={(e) => setSoldPriceInput(parseFloat(e.target.value) || 0)}
                    className="px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none w-full"
                    required
                  />
                  <p className="text-[10px] text-neutral-500">Der tatsächliche Betrag, den der Käufer bezahlt hat.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label htmlFor="sold-fees" className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">Vinted Fees & Porti (€)</label>
                    <input
                      id="sold-fees"
                      type="number"
                      step="0.01"
                      min="0"
                      value={soldFeesInput}
                      onChange={(e) => setSoldFeesInput(parseFloat(e.target.value) || 0)}
                      className="px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none w-full"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label htmlFor="sold-date" className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">Verkaufsdatum</label>
                    <input
                      id="sold-date"
                      type="date"
                      value={soldDateInput}
                      onChange={(e) => setSoldDateInput(e.target.value)}
                      className="px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-xs focus:border-[#00E676]/50 outline-none w-full"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-neutral-400 uppercase tracking-widest font-bold">Erwarteter Gewinn:</span>
                  <span className={`text-sm font-black ${(soldPriceInput - soldArticle.purchasePrice - soldFeesInput) >= 0 ? 'text-[#00E676]' : 'text-rose-500'}`}>
                    {(soldPriceInput - soldArticle.purchasePrice - soldFeesInput).toFixed(2)} €
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSoldArticle(null)}
                    className="px-4 py-2 bg-neutral-900 border border-white/5 hover:border-white/12 text-neutral-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAsSoldConfirm}
                    className="px-5 py-2 bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-black rounded-lg transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] cursor-pointer"
                  >
                    Als Verkauft Buchen
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELETE CONFIRMATION DIAGRAM MODAL (Scale and Fade) --- */}
      <AnimatePresence>
        {deleteArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteArticle(null)}
              className="absolute inset-0 bg-[#050506]/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#111114]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[24px] p-6 max-w-sm w-full z-10 text-center"
            >
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full inline-block mb-3.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1.5 font-sans">Artikel unwiderruflich löschen?</h3>
              <p className="text-neutral-400 text-xs px-2 mb-4 font-sans">
                Sind Sie sicher, dass Sie „{deleteArticle.name}“ entfernen möchten? Dieser Eintrag verschwindet permanent aus der Buchführung.
              </p>

              <div className="flex items-center justify-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteArticle(null)}
                  className="px-4 py-2 bg-neutral-900 border border-white/5 hover:border-white/12 text-neutral-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleDeleteArticle}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
                >
                  Löschen bestätigen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- RESET DEMO DATA CONFIRMATION MODAL (Scale and Fade) --- */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-[#050506]/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#111114]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[24px] p-6 max-w-sm w-full z-10 text-center"
            >
              <div className="p-3 bg-[#00E676]/10 border border-[#00E676]/20 text-[#00E676] rounded-full inline-block mb-3.5">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1.5 font-sans">Demos wiederherstellen?</h3>
              <p className="text-neutral-400 text-xs px-2 mb-4 font-sans">
                Möchten Sie alle Daten auf den ursprünglichen Zustand zurücksetzen? Eigene Änderungen gehen verloren.
              </p>

              <div className="flex items-center justify-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-neutral-900 border border-white/5 hover:border-white/12 text-neutral-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleResetToSample}
                  className="px-4 py-2 bg-[#00E676] hover:bg-[#00c853] text-black text-xs font-black rounded-lg transition-all shadow-md cursor-pointer"
                >
                  Bestätigen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOAST NOTIFICATIONS SLIDER OVERLAY (Bottom Right screen) --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className={`p-3.5 pr-8 rounded-xl border pointer-events-auto shadow-xl flex items-center space-x-2.5 text-xs text-white max-w-sm relative ${
                toast.type === 'success' 
                  ? 'bg-black/60 border-[#00E676]/30 backdrop-blur-md' 
                  : toast.type === 'error'
                    ? 'bg-black/60 border-rose-500/30 backdrop-blur-md'
                    : 'bg-black/60 border-white/10 backdrop-blur-md'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-[#00E676] shrink-0" />}
              {toast.type === 'error' && <X className="w-4.5 h-4.5 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4.5 h-4.5 text-teal-400 shrink-0" />}
              
              <span className="font-semibold">{toast.msg}</span>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
