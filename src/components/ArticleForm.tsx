/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Article, ArticleStatus } from '../types';
import { CATEGORIES } from '../mockData';
import { getArticleDetails, generatePlaceholderSvg } from '../utils';
import { Upload, X, HelpCircle, Save, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface ArticleFormProps {
  article?: Article | null; // If editing
  onSave: (article: Article) => void;
  onCancel: () => void;
}

export default function ArticleForm({ article, onSave, onCancel }: ArticleFormProps) {
  const isEditing = !!article;
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [fees, setFees] = useState<number | ''>('');
  const [status, setStatus] = useState<ArticleStatus>('Auf Lager');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with existing article data on edit
  useEffect(() => {
    if (article) {
      setName(article.name);
      setCategory(article.category);
      setPurchasePrice(article.purchasePrice);
      setSellingPrice(article.sellingPrice);
      setFees(article.fees);
      setStatus(article.status);
      setPurchaseDate(article.purchaseDate);
      setSaleDate(article.saleDate || '');
      setNotes(article.notes || '');
      setImage(article.image);
    } else {
      // Defaults for new article
      const today = new Date().toISOString().split('T')[0];
      setPurchaseDate(today);
      setStatus('Auf Lager');
      setCategory(CATEGORIES[0]);
      setPurchasePrice('');
      setSellingPrice('');
      setFees(0);
      setNotes('');
      setImage(undefined);
    }
    setErrorMessage(null);
  }, [article]);

  const pPrice = purchasePrice === '' ? 0 : purchasePrice;
  const sPrice = sellingPrice === '' ? 0 : sellingPrice;
  const fCost = fees === '' ? 0 : fees;

  // Real-time calculation previews
  const tempArticle: Article = {
    id: article?.id || 'temp',
    name: name || 'Vorschau',
    category,
    purchasePrice: pPrice,
    sellingPrice: sPrice,
    fees: fCost,
    status,
    purchaseDate: purchaseDate || '2026-01-01',
    saleDate: status === 'Verkauft' ? (saleDate || '2026-01-01') : undefined,
    notes,
    image
  };

  const { profit, roi, margin } = getArticleDetails(tempArticle);

  // Base64 file uploader handlers
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Bitte nur Bilddateien hochladen.');
      return;
    }
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Offscreen canvas at ideal 400x500 px (4:5 ratio) for ultra fast & secure storage
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 500;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imgRatio = img.width / img.height;
            const targetRatio = 4 / 5;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            
            if (imgRatio > targetRatio) {
              // Crop horizontal sides
              sw = img.height * targetRatio;
              sx = (img.width - sw) / 2;
            } else {
              // Crop top/bottom sides
              sh = img.width / targetRatio;
              sy = (img.height - sh) / 2;
            }
            
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 400, 500);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            setImage(compressed);
          } else {
            setImage(e.target?.result as string);
          }
        } catch (err) {
          console.error('Image compression failed, using original', err);
          setImage(e.target?.result as string);
        }
      };
      img.onerror = () => {
        setErrorMessage('Fehler beim Laden des Fotos.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImage(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setErrorMessage('Bitte geben Sie einen Artikelnamen an.');
      return;
    }
    
    if (pPrice < 0 || sPrice < 0 || fCost < 0) {
      setErrorMessage('Preise und Gebühren können nicht negativ sein.');
      return;
    }

    setErrorMessage(null);

    // Fallback dynamic placeholder generator
    const finalImage = image || generatePlaceholderSvg(name, category);

    const savedArticle: Article = {
      id: article?.id || `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      fees: fCost,
      status,
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      saleDate: status === 'Verkauft' ? (saleDate || new Date().toISOString().split('T')[0]) : undefined,
      notes: notes.trim(),
      image: finalImage,
    };

    onSave(savedArticle);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-left">
      
      {/* Drawer Header (Static at top) */}
      <div className="pb-4 border-b border-white/[0.06] pr-12">
        <h2 className="text-xl md:text-2xl font-black font-sans text-white tracking-tight">
          {isEditing ? 'ARTIKEL BEARBEITEN' : 'NEUEN ARTIKEL INSERIEREN'}
        </h2>
        <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-mono">
          {isEditing ? 'Eintrag anpassen und Buchführung aktualisieren' : 'Vinted-Kauf oder Listing protokollieren'}
        </p>
      </div>

      {/* Main Scrollable Fields Container */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden min-h-0 pt-4">
        
        {/* Scrollable Fields wrapper to allow fixed header and footer on mobile */}
        <div className="flex-1 overflow-y-auto pr-1 md:pr-2 scrollbar-thin scrollbar-thumb-neutral-800 space-y-5 pb-6">
          
          {/* Elegant Display error banner if any validation fails */}
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2.5"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
              <button 
                type="button" 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Card left: Image uploader (Strict 4:5 ratio) */}
            <div className="md:col-span-5 flex flex-col space-y-3">
              <label className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Artikel-Foto (4:5)</label>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative aspect-[4/5] w-full rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-md select-none ${
                  dragActive 
                    ? 'border-[#00E676] bg-[#00E676]/5 ring-4 ring-[#00E676]/10' 
                    : image 
                      ? 'border-white/10 hover:border-white/20' 
                      : 'border-dashed border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <input 
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleChange}
                />

                {image ? (
                  <>
                    <img 
                      src={image} 
                      alt="Product" 
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    />
                    {/* Glass top shield */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                    
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 p-2 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-full border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 z-20"
                      title="Bild entfernen"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-3 left-3 right-3 text-[11px] text-white/90 backdrop-blur-md bg-neutral-950/50 px-2 py-1.5 rounded-lg border border-white/5 font-mono text-center z-10">
                      Foto hochgeladen (4:5 Fit)
                    </div>
                  </>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center text-center p-4 cursor-pointer w-full h-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="p-4 rounded-full bg-neutral-950 border border-white/[0.06] mb-3 text-neutral-400 group-hover:text-white transition-all">
                      <Upload className="w-5 h-5 animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-200">Foto hochladen</p>
                    <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
                      Klicken oder Foto hierher ziehen (wird automatisch in 4:5 formatiert)
                    </p>
                    <div className="mt-4 px-2 py-1 rounded border border-neutral-800 text-[10px] text-neutral-500 bg-neutral-950 font-mono">
                      Lokale Generierung bei leerer Datei
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card right: Information inputs */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              
              {/* Name */}
              <div className="flex flex-col space-y-1.5 font-sans">
                <label htmlFor="article-name" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Artikelname *</label>
                <input
                  id="article-name"
                  type="text"
                  placeholder="z.B. Carhartt Detroit Jacke Vintage Black"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-sans text-sm focus:border-[#00E676]/50 focus:ring-1 focus:ring-[#00E676]/30 outline-none transition-all placeholder:text-neutral-600"
                  required
                />
              </div>

              {/* Category and Status Group */}
              <div className="grid grid-cols-2 gap-4 font-sans">
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="article-category" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Kategorie</label>
                  <select
                    id="article-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-sans text-sm outline-none focus:border-[#00E676]/50 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#111114]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="article-status" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Status</label>
                  <select
                    id="article-status"
                    value={status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as ArticleStatus;
                      setStatus(nextStatus);
                      if (nextStatus === 'Verkauft' && !saleDate) {
                        setSaleDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-sans text-sm outline-none focus:border-[#00E676]/50 transition-all cursor-pointer"
                  >
                    <option value="Auf Lager" className="bg-[#111114]">📦 Auf Lager</option>
                    <option value="Inseriert" className="bg-[#111114]">🏷️ Inseriert</option>
                    <option value="Verkauft" className="bg-[#111114]">🤝 Verkauft</option>
                  </select>
                </div>
              </div>

              {/* Financial Numbers Group */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="purchase-price" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Einkauf (€)</label>
                  <input
                    id="purchase-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => {
                      setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="selling-price" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">
                    {status === 'Verkauft' ? 'Verkauf (€)' : 'Inseriert (€)'}
                  </label>
                  <input
                    id="selling-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => {
                      setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="article-fees" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">
                    Gebühren (€)
                  </label>
                  <input
                    id="article-fees"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={fees}
                    onChange={(e) => {
                      setFees(e.target.value === '' ? '' : parseFloat(e.target.value));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Dates Group */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="purchase-date" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Kaufdatum</label>
                  <input
                    id="purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none transition-all cursor-pointer"
                  />
                </div>

                {status === 'Verkauft' && (
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="sale-date" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Verkaufsdatum</label>
                    <input
                      id="sale-date"
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-3 py-3 bg-black/40 border border-[#00E676]/30 rounded-xl text-white font-mono text-sm focus:border-[#00E676]/50 outline-none transition-all cursor-pointer"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="article-notes" className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Notizen & Details</label>
                <textarea
                  id="article-notes"
                  placeholder="Zustand, Kaufort, Maße, Mängel, Versandinformationen..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-sans text-sm focus:border-[#00E676]/50 outline-none transition-all resize-none placeholder:text-neutral-600"
                />
              </div>

            </div>
          </div>

          {/* Real-time accounting live calculator display (Preview) */}
          <div className="p-4 bg-white/5 backdrop-blur-md rounded-[16px] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-neutral-400 text-xs font-semibold uppercase tracking-wider font-mono">
              <Info className="w-4 h-4 text-[#00E676]" />
              <span>Vorschau-Kalkulation:</span>
            </div>
            
            <div className="flex items-center space-x-6 text-right justify-between sm:justify-end">
              <div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Profit</p>
                <p className={`text-sm md:text-base font-black font-mono leading-none ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-500'}`}>
                  {profit >= 0 ? '+' : ''}{profit.toFixed(2)} €
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">ROI</p>
                <p className={`text-sm md:text-base font-black font-mono leading-none ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-500'}`}>
                  {profit >= 0 ? '+' : ''}{roi.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Marge</p>
                <p className={`text-sm md:text-base font-black font-mono leading-none ${profit >= 0 ? 'text-[#00E676]' : 'text-rose-500'}`}>
                  {profit >= 0 ? '+' : ''}{margin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Drawer Buttons (Docked static at bottom) */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/[0.06] bg-[#111114]/95 backdrop-blur-xl shrink-0 pb-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-neutral-900 border border-white/5 hover:border-white/12 text-neutral-300 font-sans text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-md hover:scale-102 active:scale-98"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 bg-[#00E676] hover:bg-[#00c853] text-black font-sans text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(0,230,118,0.35)] hover:shadow-[0_0_25px_rgba(0,230,118,0.5)] hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Änderungen speichern' : 'Artikel eintragen'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
