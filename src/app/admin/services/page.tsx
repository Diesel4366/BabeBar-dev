'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Service } from '@/types';
import { CATEGORY_ORDER } from '@/lib/config';
import { Plus, Trash2, Edit2, Clock, X, Check, Package, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ServiceForm = Omit<Service, 'id' | 'created_at'>;

interface ServiceMaterial {
  id: string;
  amount: number;
  material_id: string;
  inventory_items: { id: string; name: string; unit: string };
}

const EMPTY_FORM: ServiceForm = {
  name: '',
  description: '',
  price: 0,
  duration_minutes: 60,
  image_url: null,
  is_active: true,
  category: 'Ресницы',
  is_addon: false,
  addon_for_category: null,
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; service?: Service } | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'materials'>('main');
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Materials state
  const [serviceMaterials, setServiceMaterials] = useState<ServiceMaterial[]>([]);
  const [allMaterials, setAllMaterials] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [newMatData, setNewMatData] = useState({ id: '', amount: 0 });

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/services');
      const data = await res.json();
      if (Array.isArray(data)) setServices(data);
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const fetchServiceMaterials = async (serviceId: string) => {
    try {
      const [smRes, allRes] = await Promise.all([
        fetch(`/api/admin/services/materials?serviceId=${serviceId}`),
        fetch('/api/admin/inventory')
      ]);
      if (smRes.ok) setServiceMaterials(await smRes.json());
      if (allRes.ok) setAllMaterials(await allRes.json());
    } catch (e) { console.error(e); }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add' });
    setActiveTab('main');
    setServiceMaterials([]);
  };

  const openEdit = (service: Service) => {
    setForm({
      name: service.name,
      description: service.description,
      price: service.price,
      duration_minutes: service.duration_minutes,
      image_url: service.image_url,
      is_active: service.is_active,
      category: service.category,
      is_addon: service.is_addon,
      addon_for_category: service.addon_for_category,
    });
    setModal({ mode: 'edit', service });
    setActiveTab('main');
    fetchServiceMaterials(service.id);
  };

  const handleAddMaterial = async () => {
    if (!modal?.service?.id || !newMatData.id || newMatData.amount <= 0) return;
    try {
      const res = await fetch('/api/admin/services/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serviceId: modal.service.id, 
          materialId: newMatData.id, 
          amount: newMatData.amount 
        }),
      });
      if (res.ok) {
        setIsAddingMaterial(false);
        setNewMatData({ id: '', amount: 0 });
        fetchServiceMaterials(modal.service.id);
      }
    } catch (e) { console.error(e); }
  };

  const handleRemoveMaterial = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/services/materials?id=${id}`, { method: 'DELETE' });
      if (res.ok && modal?.service) fetchServiceMaterials(modal.service.id);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal?.mode === 'add') {
        await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else if (modal?.service) {
        await fetch('/api/admin/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: modal.service.id, ...form }),
        });
      }
      setModal(null);
      await fetchServices();
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/services?id=${id}`, { method: 'DELETE' });
      setDeleteId(null);
      await fetchServices();
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">
            Каталог <span style={{ color: '#D14D72' }} className="italic">услуг</span>
          </h1>
          <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">
            {services.length} услуг доступно для записи
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#0A0A0A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#D14D72] transition-all shadow-lg shadow-black/10">
          <Plus size={20} />
          Добавить новую
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2" style={{ borderTopColor: '#D14D72' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(service => (
            <div key={service.id} className={`bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-500 group ${!service.is_active ? 'opacity-50' : ''}`}>
              <div className="relative h-56 bg-zinc-100 flex items-center justify-center overflow-hidden">
                {service.image_url ? (
                  <Image src={service.image_url} alt={service.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <span className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em]">Нет фото</span>
                )}
                {!service.is_active && (
                  <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-full">Архив</span>
                  </div>
                )}
                {service.is_addon && (
                  <div style={{ backgroundColor: '#D14D72' }} className="absolute top-4 left-4 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                    Addon
                  </div>
                )}
              </div>

              <div className="p-10 flex-1 flex flex-col">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-3">{service.category}</div>
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0A0A0A] mb-3 leading-none group-hover:text-[#D14D72] transition-colors">{service.name}</h3>
                <p className="text-zinc-400 text-xs mb-8 line-clamp-2 leading-relaxed font-medium flex-1 italic">
                  {service.description || 'Описание не добавлено'}
                </p>

                <div className="flex justify-between items-center bg-zinc-50/50 border border-zinc-100 p-5 rounded-3xl mb-8">
                  <div className="flex items-center gap-2 text-zinc-400 font-black text-[9px] uppercase tracking-widest">
                    <Clock size={14} style={{ color: '#D14D72' }} />
                    <span>{service.duration_minutes} мин</span>
                  </div>
                  <div className="text-xl font-black text-[#0A0A0A]">
                    {service.price > 0 ? `${service.price} ₽` : '0 ₽'}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(service)}
                    className="flex-1 py-4 rounded-2xl bg-white border border-zinc-100 text-[10px] font-black uppercase tracking-widest hover:border-[#D14D72] transition-all flex justify-center items-center gap-2"
                  >
                    <Edit2 size={14} />
                    Изменить
                  </button>
                  <button
                    onClick={() => setDeleteId(service.id)}
                    className="w-14 h-14 rounded-2xl bg-zinc-50 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-10 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                  {modal.mode === 'add' ? 'Новая' : 'Изменить'} <span style={{ color: '#D14D72' }} className="italic">услугу</span>
                </h2>
                {modal.mode === 'edit' && (
                  <div className="flex gap-4 mt-4">
                    <button 
                      onClick={() => setActiveTab('main')}
                      className={`text-[9px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${activeTab === 'main' ? 'text-zinc-900' : 'border-transparent text-zinc-400'}`}
                      style={activeTab === 'main' ? { borderBottomColor: '#D14D72' } : {}}
                    >
                      Основное
                    </button>
                    <button 
                      onClick={() => setActiveTab('materials')}
                      className={`text-[9px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${activeTab === 'materials' ? 'text-zinc-900' : 'border-transparent text-zinc-400'}`}
                      style={activeTab === 'materials' ? { borderBottomColor: '#D14D72' } : {}}
                    >
                      🌿 Состав
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setModal(null)} className="text-zinc-300 hover:text-zinc-600 transition-colors">
                <X size={28} />
              </button>
            </div>

            {activeTab === 'main' ? (
              <div className="p-10 space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Название услуги</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#FAFAFA] border border-zinc-100 rounded-2xl px-6 py-5 font-bold text-sm focus:border-[#D14D72] outline-none transition-all"
                    placeholder="Напр: Ламинирование ресниц"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Категория</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-zinc-100 rounded-2xl px-6 py-5 font-bold text-sm focus:border-[#D14D72] outline-none appearance-none"
                    >
                      {CATEGORY_ORDER.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Цена (₽)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full bg-[#FAFAFA] border border-zinc-100 rounded-2xl px-6 py-5 font-bold text-sm focus:border-[#D14D72] outline-none transition-all text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Длительность (минуты)</label>
                  <input
                    type="range"
                    min={15}
                    max={240}
                    step={15}
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className="w-full mb-2 accent-[#D14D72]"
                  />
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span>15 мин</span>
                    <span style={{ color: '#D14D72' }} className="text-sm font-black italic">{form.duration_minutes} минут</span>
                    <span>4 часа</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Описание</label>
                  <textarea
                    value={form.description ?? ''}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#FAFAFA] border border-zinc-100 rounded-2xl px-6 py-5 font-bold text-sm focus:border-[#D14D72] outline-none resize-none transition-all"
                    placeholder="Расскажите об услуге..."
                  />
                </div>

                <div className="space-y-6 bg-zinc-50/50 p-8 rounded-[2rem] border border-zinc-100">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-[#D14D72] transition-colors">Показывать на сайте</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_active: !form.is_active })}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.is_active ? 'bg-[#D14D72] shadow-lg shadow-[#D14D72]/20' : 'bg-zinc-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${form.is_active ? 'left-7' : 'left-1'}`} />
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group border-t border-zinc-100 pt-6">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-[#D14D72] transition-colors">Это дополнительная услуга</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_addon: !form.is_addon, addon_for_category: !form.is_addon ? form.category : null })}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.is_addon ? 'bg-[#D14D72] shadow-lg shadow-[#D14D72]/20' : 'bg-zinc-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${form.is_addon ? 'left-7' : 'left-1'}`} />
                    </button>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-5 rounded-2xl border border-zinc-100 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name}
                    style={!(saving || !form.name) ? { backgroundColor: '#D14D72' } : {}}
                    className="flex-1 py-5 rounded-2xl bg-[#0A0A0A] text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {saving
                      ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : <><Check size={16} /> {modal.mode === 'add' ? 'СОЗДАТЬ' : 'СОХРАНИТЬ'}</>
                    }
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                    {serviceMaterials.length > 0 ? (
                      serviceMaterials.map((sm) => (
                        <div key={sm.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center">
                              <Package size={18} style={{ color: '#D14D72' }} />
                            </div>
                            <div>
                              <div className="text-sm font-black uppercase tracking-tight text-[#0A0A0A]">{sm.inventory_items.name}</div>
                              <div className="text-[10px] font-bold text-zinc-400">Расход: {sm.amount} {sm.inventory_items.unit}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveMaterial(sm.id)}
                            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[2rem] text-zinc-300">
                         <Leaf size={32} className="mx-auto mb-4 opacity-20" />
                         <p className="text-[10px] font-black uppercase tracking-widest">Состав не указан</p>
                      </div>
                    )}
                 </div>

                 {isAddingMaterial ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 bg-[#0A0A0A] rounded-[2rem] text-white space-y-6 shadow-xl"
                    >
                       <div>
                          <label className="text-[9px] font-black uppercase text-zinc-500 block mb-2">Выберите материал</label>
                          <select 
                            value={newMatData.id}
                            onChange={(e) => setNewMatData({ ...newMatData, id: e.target.value })}
                            className="w-full bg-zinc-900 border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-1 focus:ring-[#D14D72] appearance-none"
                          >
                            <option value="">-- Выбрать --</option>
                            {allMaterials.filter(m => !serviceMaterials.find(sm => sm.material_id === m.id)).map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                            ))}
                          </select>
                       </div>
                       <div>
                          <label className="text-[9px] font-black uppercase text-zinc-500 block mb-2">Количество списания</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={newMatData.amount}
                            onChange={(e) => setNewMatData({ ...newMatData, amount: parseFloat(e.target.value) })}
                            className="w-full bg-zinc-900 border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-1 focus:ring-[#D14D72]"
                            placeholder="0.00"
                          />
                       </div>
                       <div className="flex gap-3">
                          <button 
                            onClick={() => setIsAddingMaterial(false)}
                            className="flex-1 py-4 rounded-xl bg-zinc-800 text-[10px] font-black uppercase tracking-widest"
                          >
                            Отмена
                          </button>
                          <button 
                            onClick={handleAddMaterial}
                            disabled={!newMatData.id || newMatData.amount <= 0}
                            style={{ backgroundColor: '#D14D72' }}
                            className="flex-1 py-4 rounded-xl text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                          >
                            Добавить
                          </button>
                       </div>
                    </motion.div>
                 ) : (
                    <button 
                      onClick={() => setIsAddingMaterial(true)}
                      className="w-full py-6 rounded-[2rem] border-2 border-zinc-100 text-zinc-400 hover:border-[#D14D72] hover:text-[#D14D72] transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Plus size={18} />
                      Добавить материал в состав
                    </button>
                 )}

                 <div className="pt-8 border-t border-zinc-100">
                    <button
                      onClick={() => setModal(null)}
                      className="w-full py-5 rounded-2xl bg-[#0A0A0A] text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#D14D72] transition-all shadow-lg shadow-black/10"
                    >
                      ЗАКРЫТЬ
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-12 shadow-2xl text-center space-y-8">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-400 mx-auto">
              <Trash2 size={36} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">Удалить услугу?</h3>
              <p className="text-zinc-400 text-xs font-medium leading-relaxed italic px-4">Это действие нельзя будет отменить, услуга исчезнет из каталога.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-5 rounded-2xl border border-zinc-100 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
