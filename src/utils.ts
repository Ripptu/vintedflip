/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Article, KPIMetrics } from './types';

// Format currency in German style (e.g., 1.250,50 €)
export function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Format percentages with sign and decimal places (e.g., +34,2 %)
export function formatPercent(value: number, includeSign = false): string {
  if (isNaN(value) || !isFinite(value)) return '0,0 %';
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

// Generate an ultra-premium abstract SVG placeholder as Data URL so every article has a 4:5 cover
export function generatePlaceholderSvg(name: string, category: string): string {
  // Use unique colors based on character codes of name to make it look highly customized
  let hash1 = 0;
  for (let i = 0; i < name.length; i++) {
    hash1 = name.charCodeAt(i) + ((hash1 << 5) - hash1);
  }
  
  const colors = [
    { from: '#1a103c', to: '#0d0d12', line: '#a855f7' }, // Purple theme
    { from: '#062d24', to: '#08080a', line: '#10b981' }, // Mint/Emerald theme
    { from: '#3b0712', to: '#09080a', line: '#f43f5e' }, // Rose/Slate theme
    { from: '#0c2340', to: '#060608', line: '#3b82f6' }, // Blue theme
    { from: '#331b00', to: '#0a0a0c', line: '#f59e0b' }, // Amber theme
  ];
  
  const selectedColorScheme = colors[Math.abs(hash1) % colors.length];
  const cFrom = selectedColorScheme.from;
  const cTo = selectedColorScheme.to;
  const cLine = selectedColorScheme.line;
  
  // Get initials
  const words = name.trim().split(/\s+/);
  const initials = words.length > 1 
    ? (words[0][0] + words[1][0]).toUpperCase() 
    : name.substring(0, 2).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
    <defs>
      <linearGradient id="bg-${hash1}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${cFrom}" />
        <stop offset="100%" stop-color="${cTo}" />
      </linearGradient>
      <radialGradient id="glow-${hash1}" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${cLine}" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    </defs>
    
    <!-- Deep gradient background -->
    <rect width="400" height="500" fill="url(#bg-${hash1})" />
    
    <!-- Soft ambient glow -->
    <circle cx="200" cy="180" r="180" fill="url(#glow-${hash1})" />
    
    <!-- Clean geometric grid patterns typical of high-end fintech -->
    <path d="M 0,50 L 400,50 M 0,100 L 400,100 M 0,150 L 400,150 M 0,200 L 400,200 M 0,250 L 400,250 M 0,300 L 400,300 M 0,350 L 400,350 M 0,400 L 400,400 M 0,445 L 400,445" 
          stroke="${cLine}" stroke-opacity="0.04" stroke-width="1" />
    <path d="M 50,0 L 50,500 M 100,0 L 100,500 M 150,0 L 150,500 M 200,0 L 200,500 M 250,0 L 250,500 M 300,0 L 300,500 M 350,0 L 350,500" 
          stroke="${cLine}" stroke-opacity="0.04" stroke-width="1" />
          
    <!-- Decorative tech line arcs -->
    <path d="M 50,380 A 150,150 0 0,1 350,380" fill="none" stroke="${cLine}" stroke-opacity="0.12" stroke-width="1.5" stroke-dasharray="8 6" />
    <circle cx="200" cy="200" r="120" fill="none" stroke="${cLine}" stroke-opacity="0.08" stroke-width="1" />
    <circle cx="200" cy="200" r="123" fill="none" stroke="white" stroke-opacity="0.01" stroke-width="1" />
    
    <!-- Crosshairs for sporty aesthetic -->
    <line x1="200" y1="60" x2="200" y2="340" stroke="${cLine}" stroke-opacity="0.03" stroke-width="1" />
    <line x1="60" y1="200" x2="340" y2="200" stroke="${cLine}" stroke-opacity="0.03" stroke-width="1" />
    
    <!-- Center visual representation -->
    <g transform="translate(200, 200)">
      <!-- Sophisticated glowing ring -->
      <circle cx="0" cy="0" r="50" fill="#000000" fill-opacity="0.4" stroke="${cLine}" stroke-opacity="0.4" stroke-width="1.5" />
      <text x="0" y="10" font-family="'Space Grotesk', 'Inter', sans-serif" font-weight="bold" font-size="28" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
        ${initials}
      </text>
    </g>
    
    <!-- Tag label bottom-left -->
    <g transform="translate(30, 440)">
      <text x="0" y="0" font-family="'Space Grotesk', 'Inter', sans-serif" font-weight="bold" font-size="11" fill="${cLine}" letter-spacing="2" opacity="0.65">
        ${category.toUpperCase()}
      </text>
      <text x="0" y="18" font-family="'Inter', sans-serif" font-size="12" fill="#9ca3af" opacity="0.8">
        VINTED ORIGINAL
      </text>
    </g>
    
    <!-- Subtle digital code or batch ID bottom-right -->
    <g transform="translate(370, 458)">
      <text x="0" y="0" font-family="monospace" font-size="9" fill="#9ca3af" opacity="0.4" text-anchor="end">
        FLIP-ID: #${Math.abs(hash1).toString(16).toUpperCase().substring(0,6)}
      </text>
    </g>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Calculate details for an individual article
export function getArticleDetails(article: Article) {
  const sellingPrice = Number(article.sellingPrice) || 0;
  const purchasePrice = Number(article.purchasePrice) || 0;
  const fees = Number(article.fees) || 0;
  
  // Profit: Verkaufspreis - Einkaufspreis - Gebühren
  const profit = sellingPrice - purchasePrice - fees;
  // ROI in %: Gewinn / Einkaufspreis * 100
  const roi = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;
  // Margin in %: Gewinn / Verkaufspreis * 100
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  
  return { profit, roi, margin };
}

// Format date in local format, safely avoiding RangeError or crashes
export function formatLocalDate(dateString?: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return 'n/a';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString || 'n/a';
  try {
    return date.toLocaleDateString('de-DE', options || { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateString;
  }
}

// Calculate aggregations and KPIs across all articles
export function calculateMetrics(articles: Article[]): KPIMetrics {
  let totalRevenueRealized = 0;
  let totalProfit = 0;
  let investedCapital = 0;
  
  let countSold = 0;
  let countListed = 0;
  let countStocked = 0;
  
  let sumPurchasePriceSold = 0;
  let sumProfitSold = 0;
  
  let sumPurchasePriceProjected = 0;
  let sumProfitProjected = 0;
  
  let bestArticle: Article | null = null;
  let maxProfit = -Infinity;

  articles.forEach(art => {
    const { profit } = getArticleDetails(art);
    
    investedCapital += art.purchasePrice;
    totalProfit += profit;
    
    if (art.status === 'Verkauft') {
      countSold++;
      totalRevenueRealized += art.sellingPrice;
      sumPurchasePriceSold += art.purchasePrice;
      sumProfitSold += profit;
    } else if (art.status === 'Inseriert') {
      countListed++;
      sumPurchasePriceProjected += art.purchasePrice;
      sumProfitProjected += profit;
    } else {
      countStocked++;
      sumPurchasePriceProjected += art.purchasePrice;
      sumProfitProjected += profit;
    }

    if (profit > maxProfit) {
      maxProfit = profit;
      bestArticle = art;
    }
  });

  const averageROI = investedCapital > 0 ? (totalProfit / investedCapital) * 100 : 0;
  const realizedROI = sumPurchasePriceSold > 0 ? (sumProfitSold / sumPurchasePriceSold) * 100 : 0;
  
  // Projected ROI includes active items (listed + on stock)
  const projectedROI = sumPurchasePriceProjected > 0 ? (sumProfitProjected / sumPurchasePriceProjected) * 100 : 0;

  return {
    totalRevenueRealized,
    totalProfit,
    investedCapital,
    averageROI,
    realizedROI,
    projectedROI,
    countSold,
    countListed,
    countStocked,
    bestArticle
  };
}

// Export articles to CSV string
export function exportToCsv(articles: Article[]): string {
  const headers = [
    'Artikelname',
    'Kategorie',
    'Einkaufspreis (€)',
    'Verkaufspreis (€)',
    'Gebühren & Versand (€)',
    'Status',
    'Kaufdatum',
    'Verkaufsdatum',
    'Gewinn (€)',
    'ROI (%)',
    'Marge (%)',
    'Notizen'
  ];

  const rows = articles.map(art => {
    const { profit, roi, margin } = getArticleDetails(art);
    return [
      `"${art.name.replace(/"/g, '""')}"`,
      `"${art.category.replace(/"/g, '""')}"`,
      art.purchasePrice.toFixed(2),
      art.sellingPrice.toFixed(2),
      art.fees.toFixed(2),
      art.status,
      art.purchaseDate,
      art.saleDate || '',
      profit.toFixed(2),
      roi.toFixed(1),
      margin.toFixed(1),
      `"${(art.notes || '').replace(/"/g, '""')}"`
    ];
  });

  // Adding Byte Order Mark (BOM) for Excel parsing in German locales (which expect semicolon / BOM)
  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  return '\uFEFF' + csvContent;
}
