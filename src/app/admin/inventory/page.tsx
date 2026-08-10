'use client';

import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, TrendingDown, AlertTriangle,
  Trash2, Edit3, Loader2, X, FileText, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  min_threshold: number;
  actual_stock: number;
  reserved_stock: number;
  avg_cost_per_unit: number;
  created_at: string;
}

// ─── Типы строк в новом документе ───────────────────────────────────────────

interface SimpleLine {
  type: 'simple';
  item_id: string;
  packages_count: number;
  units_per_package: number;
  package_price: number;
}

interface BundleLine {
  type: 'bundle';
  name: string;
  packages_count: number;
  total_price: number;
  lines: { item_id: string; qty_per_package: number }[];
}

type PurchaseLine = SimpleLine | BundleLine;

// ─── История ─────────────────────────────────────────────────────────────────

interface ReceiptGroup {
  id: string;
  name: string | null;
  total_price: number;
  packages_count: number;
  inventory_receipt_items: {
    id: string;
    quantity: number;
    cost_per_unit: number | null;
    inventory_items: { id: string; name: string; unit: string } | null;
  }[];
}

interface Receipt {
  id: string;
  number: string;
  date: string;
  supplier: string | null;
  comment: string | null;
  created_at: string;
  receipt_purchase_groups: ReceiptGroup[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ru-RU'); }
function fmtCost(n: number | null | undefined) {
  if (!n) return '—';
  return n % 1 === 0 ? `${fmt(n)} ₽` : `${n.toFixed(2)} ₽`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Модал материала
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: 'мл', min_threshold: 0, actual_stock: 0 });

  // История поступлений
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  // Модал поступления
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState({ date: new Date().toISOString().split('T')[0], supplier: '', comment: '' });
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [receiptSaving, setReceiptSaving] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/inventory');
      if (res.ok) setItems(await res.json());
    } finally { setIsLoading(false); }
  };

  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/receipts');
      if (res.ok) setReceipts(await res.json());
    } finally { setReceiptsLoading(false); }
  };

  const toggleReceipts = () => {
    setShowReceipts(v => { if (!v) fetchReceipts(); return !v; });
  };

  // ─── Материал ──────────────────────────────────────────────────────────────
  const handleOpenModal = (item: InventoryItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, unit: item.unit, min_threshold: item.min_threshold, actual_stock: item.actual_stock });
    } else {
      setEditingItem(null);
      setFormData({ name: '', unit: 'мл', min_threshold: 0, actual_stock: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItem ? 'PATCH' : 'POST';
    const body = editingItem ? { id: editingItem.id, ...formData } : formData;
    const res = await fetch('/api/admin/inventory', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setIsModalOpen(false); fetchItems(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить материал?')) return;
    const res = await fetch(`/api/admin/inventory?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchItems();
  };

  // ─── Строки поступления ───────────────────────────────────────────────────
  const addSimpleLine = () => setPurchaseLines(l => [...l, { type: 'simple', item_id: '', packages_count: '', units_per_package: '', package_price: '' } as unknown as SimpleLine]);
  const addBundleLine = () => setPurchaseLines(l => [...l, { type: 'bundle', name: '', packages_count: '', total_price: '', lines: [{ item_id: '', qty_per_package: '' }] } as unknown as BundleLine]);
  const removePurchaseLine = (i: number) => setPurchaseLines(l => l.filter((_, idx) => idx !== i));

  const updateSimple = (i: number, field: keyof SimpleLine, value: string | number) => {
    setPurchaseLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } as SimpleLine : line));
  };

  const updateBundle = (i: number, field: keyof BundleLine, value: string | number) => {
    setPurchaseLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } as BundleLine : line));
  };

  const addBundleRow = (i: number) => {
    setPurchaseLines(l => l.map((line, idx) => {
      if (idx !== i || line.type !== 'bundle') return line;
      return { ...line, lines: [...line.lines, { item_id: '', qty_per_package: '' as unknown as number }] };
    }));
  };

  const updateBundleRow = (lineIdx: number, rowIdx: number, field: 'item_id' | 'qty_per_package', value: string | number) => {
    setPurchaseLines(l => l.map((line, idx) => {
      if (idx !== lineIdx || line.type !== 'bundle') return line;
      const rows = line.lines.map((r, ri) => ri === rowIdx ? { ...r, [field]: value } : r);
      return { ...line, lines: rows };
    }));
  };

  const removeBundleRow = (lineIdx: number, rowIdx: number) => {
    setPurchaseLines(l => l.map((line, idx) => {
      if (idx !== lineIdx || line.type !== 'bundle') return line;
      return { ...line, lines: line.lines.filter((_, ri) => ri !== rowIdx) };
    }));
  };

  // Расчёт себестоимости для превью
  const calcSimpleCost = (l: SimpleLine) =>
    l.units_per_package > 0 ? l.package_price / l.units_per_package : 0;

  const calcBundleCost = (l: BundleLine) => {
    const totalUnits = l.lines.reduce((s, r) => s + r.qty_per_package, 0);
    return totalUnits > 0 ? l.total_price / totalUnits : 0;
  };

  const handleReceiptSave = async () => {
    const normalized = purchaseLines.map(l => l.type === 'simple'
      ? { ...l, package_price: l.package_price || 0 }
      : { ...l, total_price: l.total_price || 0 });
    const valid = normalized.filter(l => {
      if (l.type === 'simple') return l.item_id && l.packages_count > 0 && l.units_per_package > 0;
      return l.packages_count > 0 && l.lines.some(r => r.item_id && r.qty_per_package > 0);
    }).map(l => l.type === 'bundle' ? { ...l, lines: l.lines.filter(r => r.item_id && r.qty_per_package > 0) } : l);
    if (valid.length === 0) return;
    setReceiptSaving(true);
    try {
      const res = await fetch('/api/admin/inventory/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...receiptHeader, lines: valid }),
      });
      if (res.ok) {
        setIsReceiptModalOpen(false);
        setReceiptHeader({ date: new Date().toISOString().split('T')[0], supplier: '', comment: '' });
        setPurchaseLines([]);
        fetchItems();
        if (showReceipts) fetchReceipts();
      }
    } finally { setReceiptSaving(false); }
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Удалить документ? Остатки будут откатаны.')) return;
    const res = await fetch(`/api/admin/inventory/receipts?id=${id}`, { method: 'DELETE' });
    if (res.ok) { fetchReceipts(); fetchItems(); }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">
            Склад <span style={{ color: '#D14D72' }} className="italic">материалов</span>
          </h1>
          <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">Учет остатков и себестоимость</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setPurchaseLines([]); setIsReceiptModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest hover:border-zinc-200 transition-all shadow-sm">
            <FileText size={16} className="text-zinc-400" /> Новое поступление
          </button>
          <button onClick={() => handleOpenModal()}
            style={{ backgroundColor: '#D14D72' }}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.02] transition-all">
            <Plus size={16} /> Добавить материал
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: <Package size={24} />, bg: 'bg-blue-50', color: 'text-blue-500', label: 'Всего позиций', value: items.length, valColor: '' },
          { icon: <TrendingDown size={24} />, bg: 'bg-red-50', color: 'text-red-500', label: 'Заканчивается', value: items.filter(i => (i.actual_stock - i.reserved_stock) <= i.min_threshold).length, valColor: 'text-red-500' },
          { icon: <AlertTriangle size={24} />, bg: 'bg-amber-50', color: 'text-amber-500', label: 'Дефицит', value: items.filter(i => (i.actual_stock - i.reserved_stock) < 0).length, valColor: 'text-amber-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>{s.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">{s.label}</span>
            </div>
            <div className={`text-4xl font-black tracking-tighter ${s.valColor}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Таблица материалов */}
      <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm">
        <div className="mb-10">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" placeholder="Поиск..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-2xl py-5 pl-16 pr-6 text-sm font-medium focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100">
                <th className="text-left py-6 px-4">Материал</th>
                <th className="text-center py-6 px-4">В наличии</th>
                <th className="text-center py-6 px-4">В резерве</th>
                <th className="text-center py-6 px-4">Доступно</th>
                <th className="text-center py-6 px-4">Порог</th>
                <th className="text-center py-6 px-4">Себестоимость</th>
                <th className="text-right py-6 px-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <Loader2 size={32} className="animate-spin mx-auto" style={{ color: '#D14D72' }} />
                </td></tr>
              ) : filteredItems.length > 0 ? filteredItems.map(item => {
                const available = item.actual_stock - item.reserved_stock;
                const isLow = available <= item.min_threshold;
                const isNeg = available < 0;
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isNeg ? 'bg-red-50 text-red-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-zinc-100 text-zinc-400'}`}>
                          <Package size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-black uppercase tracking-tight">{item.name}</div>
                          <div className="text-[10px] font-bold text-zinc-400">{item.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-center text-sm font-bold">{item.actual_stock}</td>
                    <td className="py-6 px-4 text-center text-sm font-bold text-zinc-400 italic">{item.reserved_stock}</td>
                    <td className="py-6 px-4 text-center">
                      <span className={`text-sm font-black ${isNeg ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-green-500'}`}>{available}</span>
                    </td>
                    <td className="py-6 px-4 text-center text-xs font-black text-zinc-300">{item.min_threshold}</td>
                    <td className="py-6 px-4 text-center">
                      {item.avg_cost_per_unit > 0
                        ? <span className="text-xs font-black text-zinc-600">{fmtCost(item.avg_cost_per_unit)}<span className="text-zinc-300">/{item.unit}</span></span>
                        : <span className="text-zinc-200 text-xs">—</span>
                      }
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(item)} className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-[#D14D72] transition-colors"><Edit3 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              }) : (
                <tr><td colSpan={7} className="py-20 text-center text-zinc-400">
                  <Package size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Склад пуст</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* История поступлений */}
      <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
        <button onClick={toggleReceipts} className="w-full flex items-center justify-between px-10 py-8 hover:bg-zinc-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-zinc-100 text-zinc-400"><FileText size={20} /></div>
            <div className="text-left">
              <div className="text-sm font-black uppercase tracking-tight">История поступлений</div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">Все документы прихода</div>
            </div>
          </div>
          {showReceipts ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
        </button>

        <AnimatePresence>
          {showReceipts && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-zinc-100">
              <div className="p-10 space-y-4">
                {receiptsLoading ? (
                  <div className="py-10 flex justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#D14D72' }} /></div>
                ) : receipts.length === 0 ? (
                  <div className="py-10 text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest">Поступлений ещё не было</div>
                ) : receipts.map(r => {
                  const totalSum = r.receipt_purchase_groups.reduce((s, g) => s + g.total_price * g.packages_count, 0);
                  const totalLines = r.receipt_purchase_groups.reduce((s, g) => s + g.inventory_receipt_items.length, 0);
                  const isExp = expandedReceipt === r.id;
                  return (
                    <div key={r.id} className="border border-zinc-100 rounded-[1.5rem] overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-zinc-50 transition-colors"
                        onClick={() => setExpandedReceipt(isExp ? null : r.id)}>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#D14D72' }}>{r.number}</span>
                          <span className="text-sm font-bold">
                            {new Date(r.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {r.supplier && <span className="text-xs text-zinc-400">{r.supplier}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-zinc-400">{totalLines} поз.</span>
                          {totalSum > 0 && <span className="text-sm font-black">{fmt(totalSum)} ₽</span>}
                          <button onClick={e => { e.stopPropagation(); handleDeleteReceipt(r.id); }}
                            className="p-2 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                          {isExp ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExp && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.15 }} className="border-t border-zinc-100 overflow-hidden">
                            <div className="px-6 py-5 space-y-5 bg-zinc-50/40">
                              {r.comment && <p className="text-xs text-zinc-400 italic">{r.comment}</p>}
                              {r.receipt_purchase_groups.map(g => (
                                <div key={g.id}>
                                  {g.name && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <Layers size={13} className="text-zinc-400" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{g.name}</span>
                                      <span className="text-[10px] text-zinc-400">× {g.packages_count} шт · {fmt(g.total_price)} ₽/шт</span>
                                    </div>
                                  )}
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        <th className="text-left py-1.5">Материал</th>
                                        <th className="text-center py-1.5">Поступило</th>
                                        <th className="text-right py-1.5">Себестоимость</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                      {g.inventory_receipt_items.map(line => (
                                        <tr key={line.id}>
                                          <td className="py-2 font-medium">{line.inventory_items?.name ?? '—'}</td>
                                          <td className="py-2 text-center font-bold">{line.quantity} {line.inventory_items?.unit}</td>
                                          <td className="py-2 text-right font-bold text-zinc-500">{fmtCost(line.cost_per_unit)}/{line.inventory_items?.unit}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модал: материал */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-3 rounded-2xl bg-zinc-50 text-zinc-400 hover:text-black transition-colors"><X size={24} /></button>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">
                {editingItem ? 'Редактировать' : 'Новый'} <span style={{ color: '#D14D72' }} className="italic">материал</span>
              </h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Название</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Напр: Клей Barbara" className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Ед. изм.</label>
                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all">
                      <option value="мл">мл</option>
                      <option value="гр">гр</option>
                      <option value="шт">шт</option>
                      <option value="упак">упак</option>
                      <option value="пар">пар</option>
                      <option value="м">м</option>
                      <option value="см">см</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Минимум (порог)</label>
                    <input type="number" step="0.01" value={formData.min_threshold} onChange={e => setFormData({ ...formData, min_threshold: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">В наличии сейчас</label>
                  <div className="flex gap-4">
                    <input type="number" step="0.01" value={formData.actual_stock} onChange={e => setFormData({ ...formData, actual_stock: parseFloat(e.target.value) })}
                      className="flex-1 bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                    <div className="w-20 bg-zinc-100 rounded-2xl flex items-center justify-center text-xs font-black text-zinc-400">{formData.unit}</div>
                  </div>
                </div>
                <button type="submit" style={{ backgroundColor: '#D14D72' }}
                  className="w-full py-6 rounded-3xl text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Сохранить
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Модал: поступление */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl max-h-[92vh] flex flex-col">

              {/* Заголовок */}
              <div className="flex items-center justify-between px-10 pt-10 pb-6 border-b border-zinc-100 flex-shrink-0">
                <h2 className="text-2xl font-black uppercase tracking-tighter">
                  Документ <span style={{ color: '#D14D72' }} className="italic">поступления</span>
                </h2>
                <button onClick={() => setIsReceiptModalOpen(false)} className="p-3 rounded-2xl bg-zinc-50 text-zinc-400 hover:text-black transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 px-10 py-6 space-y-8">

                {/* Шапка */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Дата', key: 'date', type: 'date' },
                    { label: 'Поставщик', key: 'supplier', type: 'text', placeholder: 'Необязательно' },
                    { label: 'Комментарий', key: 'comment', type: 'text', placeholder: 'Необязательно' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{f.label}</label>
                      <input type={f.type} value={receiptHeader[f.key as keyof typeof receiptHeader]}
                        placeholder={f.placeholder}
                        onChange={e => setReceiptHeader(h => ({ ...h, [f.key]: e.target.value }))}
                        className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                    </div>
                  ))}
                </div>

                {/* Строки закупки */}
                <div className="space-y-4">
                  {purchaseLines.map((line, i) => (
                    <div key={i} className="border border-zinc-100 rounded-[1.5rem] overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {line.type === 'simple' ? <Package size={13} /> : <Layers size={13} />}
                          {line.type === 'simple' ? 'Простая позиция' : 'Комплект'}
                        </span>
                        <button onClick={() => removePurchaseLine(i)} className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                      </div>

                      <div className="p-5 space-y-4">
                        {line.type === 'simple' ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Материал</label>
                                <select value={line.item_id} onChange={e => updateSimple(i, 'item_id', e.target.value)}
                                  className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20">
                                  <option value="">— выберите —</option>
                                  {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                                </select>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Упак. куплено</label>
                                  <input type="number" min="1" step="1" value={line.packages_count} placeholder="—"
                                    onChange={e => updateSimple(i, 'packages_count', e.target.value === '' ? '' : (parseFloat(e.target.value) || 1))}
                                    className="w-full bg-zinc-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Ед. в упак.</label>
                                  <input type="number" min="0.01" step="0.01" value={line.units_per_package} placeholder="—"
                                    onChange={e => updateSimple(i, 'units_per_package', e.target.value === '' ? '' : (parseFloat(e.target.value) || 1))}
                                    className="w-full bg-zinc-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Цена упак. ₽</label>
                                  <input type="number" min="0" step="0.01" value={line.package_price} placeholder="—"
                                    onChange={e => updateSimple(i, 'package_price', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                    className="w-full bg-zinc-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                              </div>
                            </div>
                            {line.item_id && line.units_per_package > 0 && (
                              <div className="flex items-center gap-6 px-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                <span>Поступит: <span className="text-zinc-700">{line.packages_count * line.units_per_package} {items.find(it => it.id === line.item_id)?.unit}</span></span>
                                <span>Себестоимость: <span style={{ color: '#D14D72' }}>{fmtCost(calcSimpleCost(line))}/{items.find(it => it.id === line.item_id)?.unit}</span></span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-1">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Название комплекта</label>
                                <input type="text" value={line.name} placeholder="Напр: Комплект ресниц"
                                  onChange={e => updateBundle(i, 'name', e.target.value)}
                                  className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Куплено шт.</label>
                                <input type="number" min="1" step="1" value={line.packages_count} placeholder="—"
                                  onChange={e => updateBundle(i, 'packages_count', e.target.value === '' ? '' : (parseFloat(e.target.value) || 1))}
                                  className="w-full bg-zinc-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Цена 1 компл. ₽</label>
                                <input type="number" min="0" step="0.01" value={line.total_price} placeholder="—"
                                  onChange={e => updateBundle(i, 'total_price', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                  className="w-full bg-zinc-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="grid grid-cols-[1fr_120px] gap-3 px-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Материал</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">Шт в компл.</span>
                              </div>
                              {line.lines.map((row, ri) => (
                                <div key={ri} className="grid grid-cols-[1fr_120px_36px] gap-2 items-center">
                                  <select value={row.item_id} onChange={e => updateBundleRow(i, ri, 'item_id', e.target.value)}
                                    className="w-full bg-zinc-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20">
                                    <option value="">— выберите —</option>
                                    {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                  </select>
                                  <input type="number" min="0.01" step="0.01" value={row.qty_per_package} placeholder="—"
                                    onChange={e => updateBundleRow(i, ri, 'qty_per_package', e.target.value === '' ? '' : (parseFloat(e.target.value) || 1))}
                                    className="w-full bg-zinc-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                  <button onClick={() => removeBundleRow(i, ri)} disabled={line.lines.length === 1}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20">
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              <button onClick={() => addBundleRow(i)}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors py-1">
                                <Plus size={12} /> Добавить позицию
                              </button>
                            </div>

                            {line.total_price > 0 && line.lines.some(r => r.item_id) && (
                              <div className="flex items-center gap-6 px-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                <span>Всего ед. в компл.: <span className="text-zinc-700">{line.lines.reduce((s, r) => s + r.qty_per_package, 0)}</span></span>
                                <span>Себестоимость: <span style={{ color: '#D14D72' }}>{fmtCost(calcBundleCost(line))}/ед.</span></span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3">
                    <button onClick={addSimpleLine}
                      className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest hover:border-zinc-200 transition-all">
                      <Package size={14} className="text-zinc-400" /> Простая позиция
                    </button>
                    <button onClick={addBundleLine}
                      className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest hover:border-zinc-200 transition-all">
                      <Layers size={14} className="text-zinc-400" /> Комплект
                    </button>
                  </div>
                </div>
              </div>

              {/* Футер */}
              <div className="px-10 pb-10 pt-6 border-t border-zinc-100 flex-shrink-0">
                <button onClick={handleReceiptSave}
                  disabled={receiptSaving || purchaseLines.length === 0}
                  style={{ backgroundColor: '#D14D72' }}
                  className="w-full py-5 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {receiptSaving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сохранение...</>
                    : 'Провести документ'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
