'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  LogOut,
  ExternalLink,
  Menu,
  X,
  Send,
  Package
} from 'lucide-react';
import LogoutButton from './LogoutButton';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_ITEMS = [
  { name: 'Дашборд', icon: LayoutDashboard, href: '/admin' },
  { name: 'Записи', icon: Calendar, href: '/admin/appointments' },
  { name: 'Услуги', icon: Scissors, href: '/admin/services' },
  { name: 'Клиенты', icon: Users, href: '/admin/clients' },
  { name: 'Склад', icon: Package, href: '/admin/inventory' },
  { name: 'Рассылка', icon: Send, href: '/admin/broadcast' },
  { name: 'Настройки', icon: Settings, href: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <>
      <div className="p-8">
        <Link href="/admin" className="flex flex-col gap-1 group" onClick={() => setIsOpen(false)}>
          <span className="text-2xl font-black uppercase tracking-tighter leading-none group-hover:text-primary transition-colors">
            BABE<span className="text-primary italic">BAR</span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            Admin Panel
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'}
              `}
            >
              <item.icon size={20} className={isActive ? 'text-white' : 'group-hover:text-primary transition-colors'} />
              <span className="text-xs font-black uppercase tracking-widest">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 space-y-3">
        <Link 
          href="/" 
          target="_blank"
          className="flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
        >
          На сайт
          <ExternalLink size={14} />
        </Link>
        <LogoutButton isSidebar />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed top-6 left-6 z-[60] w-12 h-12 bg-[#0A0A0A] text-white rounded-2xl flex items-center justify-center shadow-lg border border-white/5 shadow-black/20"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-[#0A0A0A] text-white flex-col z-50 border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-[#0A0A0A] text-white flex flex-col z-[55] shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
