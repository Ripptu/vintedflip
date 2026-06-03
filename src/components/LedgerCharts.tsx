/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, LineChart, Line 
} from 'recharts';
import { Article } from '../types';
import { getArticleDetails } from '../utils';
import { CATEGORIES } from '../mockData';
import { TrendingUp, BarChart3, PieChart, Calendar } from 'lucide-react';

interface LedgerChartsProps {
  articles: Article[];
}

export default function LedgerCharts({ articles }: LedgerChartsProps) {
  const [activeChartTab, setActiveChartTab] = useState<'timeline' | 'categories' | 'monthly'>('timeline');

  // 1. TIMELINE - Cumulative profit and revenue over chronological purchases/sales
  const timelineData = useMemo(() => {
    // Collect all event dates (purchases and sales)
    const events: { date: string; profitChange: number; revenueChange: number; expensesChange: number }[] = [];
    
    articles.forEach(art => {
      const { profit } = getArticleDetails(art);
      
      // Expense added on purchaseDate (purchase price)
      events.push({
        date: art.purchaseDate,
        profitChange: 0,
        revenueChange: 0,
        expensesChange: art.purchasePrice
      });

      if (art.status === 'Verkauft' && art.saleDate) {
        // Sold event
        events.push({
          date: art.saleDate,
          profitChange: profit,
          revenueChange: art.sellingPrice,
          expensesChange: art.fees || 0
        });
      } else {
        // Listed or Stocked - projected profit event on purchase date
        events.push({
          date: art.purchaseDate,
          profitChange: profit,
          revenueChange: 0,
          expensesChange: art.fees || 0
        });
      }
    });

    // Sort events by date safely
    events.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      const valA = isNaN(timeA) ? 0 : timeA;
      const valB = isNaN(timeB) ? 0 : timeB;
      return valA - valB;
    });

    // Aggregate cumulatively
    let cumulativeProfit = 0;
    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;

    const aggregated = events.reduce((acc, ev) => {
      cumulativeProfit += ev.profitChange;
      cumulativeRevenue += ev.revenueChange;
      cumulativeExpenses += (ev.expensesChange || 0);

      // Format date beautifully (e.g. 15. Mai)
      const dateObj = new Date(ev.date);
      if (isNaN(dateObj.getTime())) return acc;
      const formattedDate = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

      // If the last entry has the exact same date, update it instead of pushing
      const last = acc[acc.length - 1];
      if (last && last.rawDate === ev.date) {
        last.Profit = parseFloat(cumulativeProfit.toFixed(2));
        last.Umsatz = parseFloat(cumulativeRevenue.toFixed(2));
        last.Ausgaben = parseFloat(cumulativeExpenses.toFixed(2));
      } else {
        acc.push({
          date: formattedDate,
          rawDate: ev.date,
          Profit: parseFloat(cumulativeProfit.toFixed(2)),
          Umsatz: parseFloat(cumulativeRevenue.toFixed(2)),
          Ausgaben: parseFloat(cumulativeExpenses.toFixed(2)),
        });
      }
      return acc;
    }, [] as any[]);

    // If empty, return fallback mock
    if (aggregated.length === 0) {
      return [{ date: 'Start', Profit: 0, Umsatz: 0, Ausgaben: 0 }];
    }

    // Limit to last 15 ticks for readability if too crowded
    return aggregated.slice(-15);
  }, [articles]);

  // 2. CATEGORY DATA - Absolute profit per category
  const categoryData = useMemo(() => {
    const rawBreakdown: Record<string, { profit: number; revenue: number; count: number }> = {};
    
    // Initialize standard categories
    CATEGORIES.forEach(cat => {
      rawBreakdown[cat] = { profit: 0, revenue: 0, count: 0 };
    });

    articles.forEach(art => {
      const { profit } = getArticleDetails(art);
      const cat = art.category || 'Sonstiges';
      if (!rawBreakdown[cat]) {
        rawBreakdown[cat] = { profit: 0, revenue: 0, count: 0 };
      }
      rawBreakdown[cat].profit += profit;
      rawBreakdown[cat].revenue += art.status === 'Verkauft' ? art.sellingPrice : 0;
      rawBreakdown[cat].count += 1;
    });

    return Object.entries(rawBreakdown)
      .map(([name, stats]) => ({
        name,
        Profit: parseFloat(stats.profit.toFixed(2)),
        Umsatz: parseFloat(stats.revenue.toFixed(2)),
        Artikel: stats.count,
      }))
      .filter(item => item.Artikel > 0)
      .sort((a, b) => b.Profit - a.Profit);
  }, [articles]);

  // 3. MONTHLY OVERVIEW - Revenue & Profit grouped by month of transaction
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { profit: number; revenue: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    articles.forEach(art => {
      const { profit } = getArticleDetails(art);
      
      // Determine the reference date: saleDate for sold, purchaseDate otherwise
      const refDateStr = art.status === 'Verkauft' && art.saleDate ? art.saleDate : art.purchaseDate;
      const dateObj = new Date(refDateStr);
      
      if (isNaN(dateObj.getTime())) return;
      
      const year = dateObj.getFullYear();
      const monthIdx = dateObj.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[monthIdx]} ${year}`;

      if (!monthsMap[key]) {
        monthsMap[key] = { profit: 0, revenue: 0 };
      }
      
      monthsMap[key].profit += profit;
      if (art.status === 'Verkauft') {
        monthsMap[key].revenue += art.sellingPrice;
      }
    });

    // Sort chronologically by key
    return Object.entries(monthsMap)
      .map(([key, data]) => ({
        key,
        name: key.split('-')[1] === '04' ? 'Apr 2026' : key.split('-')[1] === '05' ? 'Mai 2026' : key.split('-')[1] === '06' ? 'Jun 2026' : key.split('-')[1], // localized nicer name fallback
        displayLabel: key, // sorting fallback
        Profit: parseFloat(data.profit.toFixed(2)),
        Umsatz: parseFloat(data.revenue.toFixed(2)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(item => {
        // Rewrite month names beautifully
        const [yr, mo] = item.key.split('-');
        const label = `${monthNames[parseInt(mo) - 1]} ${yr}`;
        return {
          ...item,
          name: label
        };
      });
  }, [articles]);

  // Custom tooltips styling for dark SaaS environment
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111114]/90 backdrop-blur-md border border-white/[0.08] p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[140px] font-sans">
          <p className="text-neutral-400 font-bold uppercase tracking-widest text-[9px] mb-1">{label}</p>
          {payload.map((pld: any) => {
            const isProfit = pld.name === 'Profit';
            const valueColor = isProfit 
              ? (pld.value >= 0 ? '#00E676' : '#f43f5e') 
              : pld.color || '#ffffff';
            return (
              <div key={pld.name} className="flex items-center justify-between space-x-4">
                <span className="text-neutral-500 font-medium">{pld.name}:</span>
                <span className="font-mono font-bold" style={{ color: valueColor }}>
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(pld.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111114]/80 border border-white/10 rounded-[24px] p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#00E676]/[0.015] rounded-full blur-3xl pointer-events-none" />
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-white/[0.04] pb-4">
        <div>
          <h3 className="text-md font-black text-white tracking-widest uppercase font-sans">Geschäftsanalysen</h3>
          <p className="text-xs text-neutral-500">Visualisierung von Rentabilität, Umsätzen und Warengruppen</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center space-x-1.5 p-1 bg-neutral-900/80 border border-white/[0.04] rounded-xl self-start">
          <button
            onClick={() => setActiveChartTab('timeline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
              activeChartTab === 'timeline' 
                ? 'bg-white text-black shadow-md' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Zuwachs & Zeitverlauf</span>
            <span className="md:hidden">Zeit</span>
          </button>
          
          <button
            onClick={() => setActiveChartTab('categories')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
              activeChartTab === 'categories' 
                ? 'bg-white text-black shadow-md' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Kategorien</span>
            <span className="md:hidden">Kategorie</span>
          </button>
          
          <button
            onClick={() => setActiveChartTab('monthly')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
              activeChartTab === 'monthly' 
                ? 'bg-white text-black shadow-md' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Monate</span>
            <span className="md:hidden">Monate</span>
          </button>
        </div>
      </div>

      {/* Render Active Chart inside responsive area */}
      <div className="h-[280px] w-full mt-4 font-mono">
        {articles.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl bg-neutral-950/20 text-neutral-500">
            <BarChart3 className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs">Ungenügend Daten für Analysen vorhanden.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'timeline' ? (
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Profit" 
                  stroke="#00E676" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#profitGrad)" 
                  name="Profit" 
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="Ausgaben" 
                  stroke="#f43f5e" 
                  strokeWidth={1.5} 
                  fillOpacity={1} 
                  fill="url(#expensesGrad)" 
                  name="Ausgaben" 
                  strokeDasharray="4 4"
                  animationDuration={1000}
                />
                <Line 
                  type="monotone" 
                  dataKey="Umsatz" 
                  stroke="#ffffff" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="Umsatz"
                  animationDuration={1000}
                />
              </AreaChart>
            ) : activeChartTab === 'categories' ? (
              <BarChart 
                data={categoryData} 
                layout="vertical"
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="rgba(255,255,255,0.4)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                />
                <Bar 
                  dataKey="Profit" 
                  fill="#00E676" 
                  radius={[0, 6, 6, 0]} 
                  name="Profit"
                  barSize={12}
                  animationDuration={1000}
                />
                <Bar 
                  dataKey="Umsatz" 
                  fill="rgba(255,255,255,0.15)" 
                  radius={[0, 6, 6, 0]} 
                  name="Umsatz"
                  barSize={12}
                  animationDuration={1000}
                />
              </BarChart>
            ) : (
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                />
                <Bar 
                  dataKey="Profit" 
                  fill="#00E676" 
                  radius={[6, 6, 0, 0]} 
                  name="Profit"
                  barSize={20}
                  animationDuration={1000}
                />
                <Bar 
                  dataKey="Umsatz" 
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]} 
                  name="Umsatz"
                  barSize={20}
                  animationDuration={1000}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
