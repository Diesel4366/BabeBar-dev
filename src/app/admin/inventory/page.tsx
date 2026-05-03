'use client';

import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, TrendingDown, AlertTriangle,
  Trash2, Edit3, Loader2, X, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  min_threshold: number;
  actual_stock: number;
  reserved_stock: number;
  created_at: string;
}

interface ReceiptLine {
  item_id: string;
  quantity: number;
  price_per_unit: number | '';
}

interface Receipt {
  id: string;
  number: string;
  date: string;
  supplier: string | null;
  comment: string | null;
  created_at: string;
  inventory_receipt_items: {
    id: string;
    quantity: number;
    price_per_unit: number | null;
    inventory_items: { id: string; name: string; unit: string } | null;
  }[];
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: 'мл', min_threshold: 0, actual_stock: 0 });

  // Поступления
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ date: new Date().toISOString().split('T')[0], supplier: '', comment: '' });
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([{ item_id: '', quantity: 1, price_per_unit: '' }]);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/inventory');
      if (res.ok) setItems(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/receipts');
      if (res.ok) setReceipts(await res.json());
    } finally {
      setReceiptsLoading(false);
    }
  };

  const toggleReceipts = () => {
    setShowReceipts(v => {
      if (!v) fetchReceipts();
      return !v;
    });
  };

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
    const res = await fetch('/api/admin/inventory', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) { setIsModalOpen(false); fetchItems(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить материал и все связи с услугами?')) return;
    const res = await fetch(`/api/admin/inventory?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchItems();
  };

  // Строки поступления
  const addLine = () => setReceiptLines(l => [...l, { item_id: '', quantity: 1, price_per_unit: '' }]);
  const removeLine = (i: number) => setReceiptLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof ReceiptLine, value: string | number) => {
    setReceiptLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  };

  const handleReceiptSave = async () => {
    const validLines = receiptLines.filter(l => l.item_id && l.quantity > 0);
    if (validLines.length === 0) return;
    setReceiptSaving(true);
    try {
      const res = await fetch('/api/admin/inventory/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: receiptForm.date,
          supplier: receiptForm.supplier || undefined,
          comment: receiptForm.comment || undefined,
          items: validLines.map(l => ({
            item_id: l.item_id,
            quantity: Number(l.quantity),
            price_per_unit: l.price_per_unit !== '' ? Number(l.price_per_unit) : undefined,
          })),
        }),
      });
      if (res.ok) {
        setIsReceiptModalOpen(false);
        setReceiptForm({ date: new Date().toISOString().split('T')[0], supplier: '', comment: '' });
        setReceiptLines([{ item_id: '', quantity: 1, price_per_unit: '' }]);
        fetchItems();
        if (showReceipts) fetchReceipts();
      }
    } finally {
      setReceiptSaving(false);
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Удалить документ? Остатки будут откатаны.')) return;
    const res = await fetch(`/api/admin/inventory/receipts?id=${id}`, { method: 'DELETE' });
    if (res.ok) { fetchReceipts(); fetchItems(); }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">
            Склад <span style={{ color: '#D14D72' }} className="italic">материалов</span>
          </h1>
          <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">
            Учет остатков и планирование закупок
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest hover:border-zinc-200 transition-all shadow-sm"
          >
            <FileText size={16} className="text-zinc-400" />
            Новое поступление
          </button>
          <button
            onClick={() => handleOpenModal()}
            style={{ backgroundColor: '#D14D72' }}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.02] transition-all"
          >
            <Plus size={16} />
            Добавить материал
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-500"><Package size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Всего<br/>позиций</span>
          </div>
          <div className="text-4xl font-black tracking-tighter">{items.length}</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-red-50 text-red-500"><TrendingDown size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Заканчивается</span>
          </div>
          <div className="text-4xl font-black tracking-tighter text-red-500">
            {items.filter(i => (i.actual_stock - i.reserved_stock) <= i.min_threshold).length}
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-500"><AlertTriangle size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Дефицит</span>
          </div>
          <div className="text-4xl font-black tracking-tighter text-amber-500">
            {items.filter(i => (i.actual_stock - i.reserved_stock) < 0).length}
          </div>
        </div>
      </div>

      {/* Таблица материалов */}
      <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-2xl py-5 pl-16 pr-6 text-sm font-medium focus:ring-2 focus:ring-[#D14D72]/20 transition-all"
            />
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
                <th className="text-right py-6 px-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center">
                  <Loader2 size={32} className="animate-spin mx-auto" style={{ color: '#D14D72' }} />
                </td></tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const available = item.actual_stock - item.reserved_stock;
                  const isLow = available <= item.min_threshold;
                  const isNegative = available < 0;
                  return (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isNegative ? 'bg-red-50 text-red-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-zinc-100 text-zinc-400'}`}>
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
                        <span className={`text-sm font-black ${isNegative ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-green-500'}`}>{available}</span>
                      </td>
                      <td className="py-6 px-4 text-center text-xs font-black text-zinc-300">{item.min_threshold}</td>
                      <td className="py-6 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(item)} className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-[#D14D72] transition-colors"><Edit3 size={16} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="py-20 text-center text-zinc-400">
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
        <button
          onClick={toggleReceipts}
          className="w-full flex items-center justify-between px-10 py-8 hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-zinc-100 text-zinc-400"><FileText size={20} /></div>
            <div className="text-left">
              <div className="text-sm font-black uppercase tracking-tight">История поступлений</div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">Все документы прихода на склад</div>
            </div>
          </div>
          {showReceipts ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
        </button>

        <AnimatePresence>
          {showReceipts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-zinc-100"
            >
              <div className="p-10 space-y-4">
                {receiptsLoading ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 size={28} className="animate-spin" style={{ color: '#D14D72' }} />
                  </div>
                ) : receipts.length === 0 ? (
                  <div className="py-10 text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                    Поступлений ещё не было
                  </div>
                ) : (
                  receipts.map(r => {
                    const total = r.inventory_receipt_items.reduce((s, i) =>
                      s + (i.price_per_unit != null ? i.quantity * i.price_per_unit : 0), 0);
                    const isExpanded = expandedReceipt === r.id;
                    return (
                      <div key={r.id} className="border border-zinc-100 rounded-[1.5rem] overflow-hidden">
                        <div
                          className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-zinc-50 transition-colors"
                          onClick={() => setExpandedReceipt(isExpanded ? null : r.id)}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-[#D14D72] uppercase tracking-widest">{r.number}</span>
                            <span className="text-sm font-bold text-zinc-700">
                              {new Date(r.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            {r.supplier && <span className="text-xs text-zinc-400 font-medium">{r.supplier}</span>}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-zinc-400">{r.inventory_receipt_items.length} поз.</span>
                            {total > 0 && <span className="text-sm font-black">{total.toLocaleString('ru-RU')} ₽</span>}
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteReceipt(r.id); }}
                              className="p-2 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                            {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="border-t border-zinc-100 overflow-hidden"
                            >
                              <div className="px-6 py-4 space-y-2 bg-zinc-50/50">
                                {r.comment && (
                                  <p className="text-xs text-zinc-400 italic mb-3">{r.comment}</p>
                                )}
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                      <th className="text-left py-2">Материал</th>
                                      <th className="text-center py-2">Кол-во</th>
                                      <th className="text-center py-2">Цена / ед.</th>
                                      <th className="text-right py-2">Сумма</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-100">
                                    {r.inventory_receipt_items.map(line => (
                                      <tr key={line.id}>
                                        <td className="py-2 font-medium">{line.inventory_items?.name ?? '—'}</td>
                                        <td className="py-2 text-center font-bold">
                                          {line.quantity} {line.inventory_items?.unit}
                                        </td>
                                        <td className="py-2 text-center text-zinc-400">
                                          {line.price_per_unit != null ? `${line.price_per_unit} ₽` : '—'}
                                        </td>
                                        <td className="py-2 text-right font-bold">
                                          {line.price_per_unit != null
                                            ? `${(line.quantity * line.price_per_unit).toLocaleString('ru-RU')} ₽`
                                            : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модал: добавить / редактировать материал */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-3 rounded-2xl bg-zinc-50 text-zinc-400 hover:text-black transition-colors">
                <X size={24} />
              </button>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">
                {editingItem ? 'Редактировать' : 'Новый'} <span style={{ color: '#D14D72' }} className="italic">материал</span>
              </h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Название</label>
                  <input required type="text" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Напр: Клей Barbara 5ml"
                    className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
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
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Минимум (порог)</label>
                    <input type="number" step="0.01" value={formData.min_threshold}
                      onChange={e => setFormData({ ...formData, min_threshold: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">В наличии сейчас</label>
                  <div className="flex gap-4">
                    <input type="number" step="0.01" value={formData.actual_stock}
                      onChange={e => setFormData({ ...formData, actual_stock: parseFloat(e.target.value) })}
                      className="flex-1 bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                    <div className="w-20 bg-zinc-100 rounded-2xl flex items-center justify-center text-xs font-black text-zinc-400">{formData.unit}</div>
                  </div>
                </div>
                <button type="submit" style={{ backgroundColor: '#D14D72' }}
                  className="w-full py-6 rounded-3xl text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-6">
                  Сохранить
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Модал: новое поступление */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsReceiptModalOpen(false)} className="absolute top-8 right-8 p-3 rounded-2xl bg-zinc-50 text-zinc-400 hover:text-black transition-colors">
                <X size={20} />
              </button>

              <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">
                Документ <span style={{ color: '#D14D72' }} className="italic">поступления</span>
              </h2>

              {/* Шапка документа */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Дата</label>
                  <input type="date" value={receiptForm.date}
                    onChange={e => setReceiptForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Поставщик</label>
                  <input type="text" value={receiptForm.supplier} placeholder="Необязательно"
                    onChange={e => setReceiptForm(f => ({ ...f, supplier: e.target.value }))}
                    className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Комментарий</label>
                  <input type="text" value={receiptForm.comment} placeholder="Необязательно"
                    onChange={e => setReceiptForm(f => ({ ...f, comment: e.target.value }))}
                    className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                </div>
              </div>

              {/* Строки */}
              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-[1fr_100px_110px_40px] gap-3 px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Материал</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Кол-во</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Цена / ед.</span>
                  <span />
                </div>

                {receiptLines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_110px_40px] gap-3 items-center">
                    <select value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20 transition-all">
                      <option value="">— выберите —</option>
                      {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                    </select>
                    <input type="number" min="0.01" step="0.01" value={line.quantity}
                      onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-4 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                    <input type="number" min="0" step="0.01" value={line.price_per_unit}
                      placeholder="—"
                      onChange={e => updateLine(i, 'price_per_unit', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-4 text-sm font-bold text-center focus:ring-2 focus:ring-[#D14D72]/20 transition-all" />
                    <button onClick={() => removeLine(i)} disabled={receiptLines.length === 1}
                      className="w-10 h-10 flex items-center justify-center rounded-2xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20">
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button onClick={addLine}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors px-1 py-2">
                  <Plus size={14} /> Добавить строку
                </button>
              </div>

              {/* Итого */}
              {receiptLines.some(l => l.price_per_unit !== '' && l.item_id) && (
                <div className="flex justify-end mb-6">
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Итого</div>
                    <div className="text-2xl font-black">
                      {receiptLines.reduce((s, l) => s + (l.item_id && l.price_per_unit !== '' ? Number(l.quantity) * Number(l.price_per_unit) : 0), 0).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleReceiptSave} disabled={receiptSaving || receiptLines.every(l => !l.item_id)}
                style={{ backgroundColor: '#D14D72' }}
                className="w-full py-5 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {receiptSaving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сохранение...</>
                  : 'Провести документ'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
