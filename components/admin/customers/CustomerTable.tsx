'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Mail, Phone, MapPin, ShoppingBag, Calendar } from 'lucide-react';
import { Pagination, Badge } from '@/components/ui';

type CustomerStatus = 'active' | 'inactive' | 'vip';

interface Customer {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orderCount: number;
  totalSpend: string;
  status: CustomerStatus;
  registrationDate: string;
  lastPurchase: string;
}

const mockCustomers: Customer[] = [
  { id: '1', customerId: '#CUST001', name: 'John Doe', email: 'john@example.com', phone: '+1 234 567 8901', address: '123 Main St, New York, NY', orderCount: 25, totalSpend: '$3,450', status: 'vip', registrationDate: '2024-01-15', lastPurchase: '2025-01-02' },
  { id: '2', customerId: '#CUST002', name: 'Jane Smith', email: 'jane@example.com', phone: '+1 234 567 8902', address: '456 Oak Ave, Los Angeles, CA', orderCount: 12, totalSpend: '$1,280', status: 'active', registrationDate: '2024-03-20', lastPurchase: '2024-12-28' },
  { id: '3', customerId: '#CUST003', name: 'Mike Johnson', email: 'mike@example.com', phone: '+1 234 567 8903', address: '789 Pine Rd, Chicago, IL', orderCount: 8, totalSpend: '$890', status: 'active', registrationDate: '2024-05-10', lastPurchase: '2024-12-15' },
  { id: '4', customerId: '#CUST004', name: 'Sarah Williams', email: 'sarah@example.com', phone: '+1 234 567 8904', address: '321 Elm St, Houston, TX', orderCount: 3, totalSpend: '$320', status: 'inactive', registrationDate: '2024-08-05', lastPurchase: '2024-09-20' },
  { id: '5', customerId: '#CUST005', name: 'Tom Brown', email: 'tom@example.com', phone: '+1 234 567 8905', address: '654 Maple Dr, Phoenix, AZ', orderCount: 45, totalSpend: '$8,920', status: 'vip', registrationDate: '2023-11-01', lastPurchase: '2025-01-03' },
  { id: '6', customerId: '#CUST006', name: 'Emily Davis', email: 'emily@example.com', phone: '+1 234 567 8906', address: '987 Cedar Ln, San Diego, CA', orderCount: 6, totalSpend: '$540', status: 'active', registrationDate: '2024-06-18', lastPurchase: '2024-12-10' },
];

const statusColors: Record<CustomerStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600' },
  vip: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

export function CustomerTable() {
  const t = useTranslations('admin.customers');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="flex gap-6">
      {/* Main Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] flex-1 transition-all ${
          selectedCustomer ? 'w-2/3' : 'w-full'
        }`}
      >
        {/* Search */}
        <div className="p-4 border-b border-[var(--color-line)]">
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              placeholder="Search customers..."
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('customerId')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('name')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('phone')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('orderCount')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('totalSpend')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {mockCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`border-b border-[var(--color-line)] last:border-0 cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-[var(--color-bg-element)]'
                      : 'hover:bg-[var(--color-bg-element)]'
                  }`}
                >
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-title-active)]">
                    {customer.customerId}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-[var(--color-text-body)]">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--color-title-active)]">{customer.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {customer.phone}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-title-active)]">
                    {customer.orderCount}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-accent)]">
                    {customer.totalSpend}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[customer.status].bg} ${statusColors[customer.status].text}`}>
                      {customer.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[var(--color-line)]">
          <Pagination
            currentPage={currentPage}
            totalPages={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </motion.div>

      {/* Customer Detail Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-80 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-bg-input)] rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-[var(--color-text-body)]">
                    {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-title-active)]">{selectedCustomer.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[selectedCustomer.status].bg} ${statusColors[selectedCustomer.status].text}`}>
                    {selectedCustomer.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <X size={18} className="text-[var(--color-text-label)]" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide">
                {t('customerInfo')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-[var(--color-text-label)]" />
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-[var(--color-text-label)]" />
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.phone}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-[var(--color-text-label)] mt-0.5" />
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.address}</span>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide">
                {t('activity')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--color-text-label)]" />
                    <span className="text-[var(--color-text-label)]">{t('registration')}</span>
                  </div>
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.registrationDate}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={14} className="text-[var(--color-text-label)]" />
                    <span className="text-[var(--color-text-label)]">{t('lastPurchase')}</span>
                  </div>
                  <span className="text-[var(--color-text-body)]">{selectedCustomer.lastPurchase}</span>
                </div>
              </div>
            </div>

            {/* Order Overview */}
            <div className="space-y-4 pt-4 border-t border-[var(--color-line)]">
              <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide">
                {t('orderOverview')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-bg-element)] rounded-[var(--radius-md)] p-3 text-center">
                  <p className="text-xl font-semibold text-[var(--color-title-active)]">{selectedCustomer.orderCount}</p>
                  <p className="text-xs text-[var(--color-text-label)]">{t('totalOrder')}</p>
                </div>
                <div className="bg-[var(--color-bg-element)] rounded-[var(--radius-md)] p-3 text-center">
                  <p className="text-xl font-semibold text-[var(--color-accent)]">{selectedCustomer.totalSpend}</p>
                  <p className="text-xs text-[var(--color-text-label)]">{t('totalSpend')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomerTable;
