'use client';

import React, { useState, useEffect } from 'react';
import { Send, Users, CheckCircle2, AlertCircle, Loader2, Search, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  telegram_username: string | null;
  telegram_id: string | null;
  phone: string | null;
}

export default function BroadcastPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
  const [results, setResults] = useState<{ success: number, failure: number } | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/broadcast/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      } else {
        setStatus({ type: 'error', text: 'Ошибка при загрузке клиентов' });
      }
    } catch (error) {
      setStatus({ type: 'error', text: 'Ошибка сети при загрузке' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (c.telegram_username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Введите текст сообщения' });
      return;
    }
    if (selectedIds.length === 0) {
      setStatus({ type: 'error', text: 'Выберите хотя бы одного получателя' });
      return;
    }

    setIsSending(true);
    setStatus({ type: null, text: '' });
    setResults(null);

    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedIds,
          message,
          sendToAll: selectedIds.length === clients.length && searchQuery === ''
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResults({ success: data.success, failure: data.failure });
        setStatus({ type: 'success', text: 'Рассылка завершена!' });
        setMessage('');
        setSelectedIds([]);
      } else {
        setStatus({ type: 'error', text: data.error || 'Ошибка при отправке' });
      }
    } catch (error) {
      setStatus({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">
          Массовая <span className="text-primary italic">рассылка</span>
        </h1>
        <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">
          Отправка сообщений клиентам в Telegram
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Left Column: Form */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm">
            <h2 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
              <Send size={24} className="text-primary" />
              Сообщение
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 ml-2">
                  Текст сообщения (Markdown поддерживается)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Привет! У нас отличные новости..."
                  className="w-full h-64 bg-zinc-50 border-none rounded-3xl p-8 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              <AnimatePresence mode="wait">
                {status.text && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-3 p-6 rounded-2xl text-xs font-bold uppercase tracking-tight ${
                      status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {status.text}
                  </motion.div>
                )}

                {results && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-zinc-50 rounded-2xl space-y-2"
                  >
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                      <span className="text-zinc-400">Успешно:</span>
                      <span className="text-green-600">{results.success}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                      <span className="text-zinc-400">Ошибок:</span>
                      <span className="text-red-600">{results.failure}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleSend}
                disabled={isSending || !message.trim() || selectedIds.length === 0}
                className={`
                  w-full py-6 rounded-3xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all
                  ${isSending || !message.trim() || selectedIds.length === 0
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'}
                `}
              >
                {isSending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Отправить ({selectedIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Client Selection */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm flex flex-col h-[800px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <Users size={24} className="text-primary" />
                Получатели
              </h2>
              <button 
                onClick={toggleSelectAll}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
              >
                {selectedIds.length === filteredClients.length ? 'Снять всё' : 'Выбрать всех'}
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Поиск по имени, @username или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl py-5 pl-16 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Загрузка базы...</span>
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const isSelected = selectedIds.includes(client.id);
                  return (
                    <div 
                      key={client.id}
                      onClick={() => toggleSelect(client.id)}
                      className={`
                        p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group
                        ${isSelected 
                          ? 'bg-primary/5 border-primary/20 shadow-sm' 
                          : 'bg-white border-zinc-100 hover:border-zinc-200'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-primary text-white' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100'}
                        `}>
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <div>
                          <div className="text-sm font-black uppercase tracking-tight text-[#0A0A0A]">
                            {client.name || 'Без имени'}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400">
                            {client.telegram_username ? `@${client.telegram_username}` : client.phone || 'Нет данных'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                          ID: {client.telegram_id?.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center p-10">
                  <Users size={48} className="mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {searchQuery ? 'Никого не нашли' : 'Нет клиентов с Telegram'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-8 border-t border-zinc-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <span>Выбрано: <span className="text-primary">{selectedIds.length}</span></span>
              <span>Всего с TG: <span className="text-zinc-900">{clients.length}</span></span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f4f4f5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e4e4e7;
        }
      `}</style>
    </div>
  );
}
