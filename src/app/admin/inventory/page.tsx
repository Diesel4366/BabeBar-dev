'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  TrendingDown, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  Loader2,
  X
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

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'мл',
    min_threshold: 0,
    actual_stock: 0
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Fetch items error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (item: InventoryItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        unit: item.unit,
        min_threshold: item.min_threshold,
        actual_stock: item.actual_stock
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        unit: 'мл',
        min_threshold: 0,
        actual_stock: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItem ? 'PATCH' : 'POST';
    const body = editingItem ? { id: editingItem.id, ...formData } : formData;

    try {
      const res = await fetch('/api/admin/inventory', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchItems();
      }
    } catch (error) {
      console.error('Save item error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены? Это удалит материал и все связи с услугами.')) return;

    try {
      const res = await fetch(`/api/admin/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch (error) {
      console.error('Delete item error:', error);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <button 
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: '#D14D72' }}
          className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.02] transition-all"
        >
          <Plus size={18} />
          Добавить материал
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-500">
              <Package size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Всего<br/>позиций</span>
          </div>
          <div className="text-4xl font-black tracking-tighter">{items.length}</div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-red-50 text-red-500">
              <TrendingDown size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Заканчивается</span>
          </div>
          <div className="text-4xl font-black tracking-tighter text-red-500">
            {items.filter(i => (i.actual_stock - i.reserved_stock) <= i.min_threshold).length}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-500">
              <AlertTriangle size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Дефицит</span>
          </div>
          <div className="text-4xl font-black tracking-tighter text-amber-500">
            {items.filter(i => (i.actual_stock - i.reserved_stock) < 0).length}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm min-h-[600px]">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-2xl py-5 pl-16 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
             <button className="flex-1 md:flex-none px-6 py-4 rounded-xl bg-zinc-50 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <History size={14} />
                Движение
             </button>
             <button className="flex-1 md:flex-none px-6 py-4 rounded-xl bg-zinc-50 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Scale size={14} />
                Инвентаризация
             </button>
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
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto" style={{ color: '#D14D72' }} />
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const available = item.actual_stock - item.reserved_stock;
                  const isLow = available <= item.min_threshold;
                  const isNegative = available < 0;

                  return (
                    <motion.tr 
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isNegative ? 'bg-red-50 text-red-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-zinc-100 text-zinc-400'}`}>
                            <Package size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-black uppercase tracking-tight text-[#0A0A0A]">{item.name}</div>
                            <div className="text-[10px] font-bold text-zinc-400">{item.unit}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-4 text-center text-sm font-bold text-zinc-900">
                        {item.actual_stock}
                      </td>
                      <td className="py-6 px-4 text-center text-sm font-bold text-zinc-400 italic">
                        {item.reserved_stock}
                      </td>
                      <td className="py-6 px-4 text-center">
                        <span className={`text-sm font-black ${isNegative ? 'text-red-500' : isLow ? 'text-amber-500 text-bold' : 'text-green-500'}`}>
                          {available}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-center text-xs font-black text-zinc-300">
                        {item.min_threshold}
                      </td>
                      <td className="py-6 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-primary transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-zinc-400">
                    <Package size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Склад пуст</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 p-3 rounded-2xl bg-zinc-50 text-zinc-400 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">
                {editingItem ? 'Редактировать' : 'Новый'} <span style={{ color: '#D14D72' }} className="italic">материал</span>
              </h2>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Название</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Напр: Клей Barbara 5ml"
                    className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Ед. изм.</label>
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all"
                    >
                      <option value="мл">мл</option>
                      <option value="гр">гр</option>
                      <option value="шт">шт</option>
                      <option value="упак">упак</option>
                      <option value="пар">пар</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">Минимум (порог)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_threshold}
                      onChange={e => setFormData({ ...formData, min_threshold: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-2">В наличии сейчас</label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.actual_stock}
                      onChange={e => setFormData({ ...formData, actual_stock: parseFloat(e.target.value) })}
                      className="flex-1 bg-zinc-50 border-none rounded-2xl py-5 px-8 text-sm font-black focus:ring-2 focus:ring-[#D14D72]/20 transition-all"
                    />
                    <div className="w-20 bg-zinc-100 rounded-2xl flex items-center justify-center text-xs font-black text-zinc-400">
                      {formData.unit}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ backgroundColor: '#D14D72' }}
                  className="w-full py-6 rounded-3xl text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-[#D14D72]/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-6"
                >
                  Сохранить
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
 </div>
  );
}
