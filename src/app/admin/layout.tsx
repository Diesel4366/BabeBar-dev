import type { Metadata } from 'next';
import React from 'react';
import Sidebar from '@/components/admin/Sidebar';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-6 md:p-12 pt-24 lg:pt-12">
        {children}
      </main>
    </div>
  );
}
