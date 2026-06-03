/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ArticleStatus = 'Auf Lager' | 'Inseriert' | 'Verkauft';

export interface Article {
  id: string;
  name: string;
  category: string;
  purchasePrice: number; // Einkaufspreis in €
  sellingPrice: number;  // Verkaufspreis (oder geplanter/inserierter Preis) in €
  fees: number;          // Vinted-Gebühren & Versandkosten in €
  status: ArticleStatus;
  purchaseDate: string;  // YYYY-MM-DD
  saleDate?: string;     // YYYY-MM-DD (optional)
  notes?: string;        // Notizen (optional)
  image?: string;        // Base64 Data URL or SVG string
}

export interface KPIMetrics {
  totalRevenueRealized: number; // Sum of selling prices for sold articles
  totalProfit: number;          // Total revenue - purchase price - fees (considering all items based on status)
  investedCapital: number;      // Sum of all purchase prices
  averageROI: number;           // Total profit %
  realizedROI: number;          // ROI for sold items
  projectedROI: number;          // ROI for listed + stocked items
  countSold: number;
  countListed: number;
  countStocked: number;
  bestArticle: Article | null;
}
