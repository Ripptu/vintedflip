/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Article } from './types';

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'f1',
    name: 'Vintage Carhartt Detroit Jacket Black',
    category: 'Jacken & Mäntel',
    purchasePrice: 42.00,
    sellingPrice: 115.00,
    fees: 7.50,
    status: 'Verkauft',
    purchaseDate: '2026-04-12',
    saleDate: '2026-04-28',
    notes: 'Im Secondhand-Shop erworben. Ein echter Klassiker mit hervorragender Vintage-Patina. Schneller Verkauf auf Vinted.',
  },
  {
    id: 'f2',
    name: 'Nike Dunk Low Retro Panda White Black',
    category: 'Schuhe',
    purchasePrice: 60.00,
    sellingPrice: 95.00,
    fees: 6.80,
    status: 'Verkauft',
    purchaseDate: '2026-04-18',
    saleDate: '2026-05-05',
    notes: 'Sneaker-Restaurierung durchgeführt: Sohle schmutzbefreit, neue Laces eingezogen. Guter Extra-Profit.',
  },
  {
    id: 'f3',
    name: 'Stüssy World Tour Hoodie Ash Grey',
    category: 'Oberteile & Hoodies',
    purchasePrice: 30.00,
    sellingPrice: 80.00,
    fees: 5.40,
    status: 'Inseriert',
    purchaseDate: '2026-05-02',
    notes: 'Zustand 9/10, kaum getragen. Derzeit sehr beliebt auf Vinted. Bereits 45 Aufrufe und 5 Favoriten.',
  },
  {
    id: 'f4',
    name: 'Supreme Camp Cap Olive Canvas',
    category: 'Accessoires',
    purchasePrice: 18.00,
    sellingPrice: 45.00,
    fees: 3.20,
    status: 'Inseriert',
    purchaseDate: '2026-05-15',
    notes: 'Klassisches Camp Cap von 2021. Box Logo in bestem Zustand.',
  },
  {
    id: 'f5',
    name: 'Vintage Levi\'s 501 Denim Light Wash',
    category: 'Hosen',
    purchasePrice: 15.00,
    sellingPrice: 40.00,
    fees: 2.80,
    status: 'Auf Lager',
    purchaseDate: '2026-05-20',
    notes: 'Wartete auf Messung der Beinlänge. Muss noch dampfgebügelt und neu fotografiert werden.',
  },
  {
    id: 'f6',
    name: 'Patagonia Synchilla Fleece Snap-T Pullover',
    category: 'Oberteile & Hoodies',
    purchasePrice: 28.00,
    sellingPrice: 75.00,
    fees: 5.90,
    status: 'Verkauft',
    purchaseDate: '2026-04-25',
    saleDate: '2026-05-18',
    notes: 'Sehr beliebter Retro-Fleece. Perfekter Zustand.',
  },
  {
    id: 'f7',
    name: 'Prada Linea Rossa Sonnenbrille Black',
    category: 'Accessoires',
    purchasePrice: 45.00,
    sellingPrice: 140.00,
    fees: 11.20,
    status: 'Auf Lager',
    purchaseDate: '2026-05-28',
    notes: 'Luxus-Segment. Tolles Schnäppchen vom Flohmarkt. Wird inseriert, sobald die Sonne wieder scheint.',
  }
];

export const CATEGORIES = [
  'Oberteile & Hoodies',
  'Jacken & Mäntel',
  'Hosen',
  'Schuhe',
  'Accessoires',
  'Sonstiges'
];
