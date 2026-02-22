'use client';

import { useTranslations } from 'next-intl';
import { Truck, CreditCard, RotateCcw } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui';

interface ProductInfoProps {
  brand: string;
  name: string;
  price: string;
  materials?: string;
  care?: string;
}

export function ProductInfo({ brand, name, price, materials, care }: ProductInfoProps) {
  const t = useTranslations('customer.product');

  return (
    <div className="px-4">
      {/* Brand & Name */}
      <p className="text-sm tracking-[0.15em] text-[var(--color-text-label)] uppercase mb-1">
        {brand}
      </p>
      <h1 className="text-xl font-medium text-[var(--color-title-active)] mb-2">
        {name}
      </h1>
      <p className="text-xl font-medium text-[var(--color-accent)] mb-6">
        {price}
      </p>

      {/* Accordion Sections */}
      <div className="border-t border-[var(--color-line)]">
        <Accordion type="single" collapsible>
          <AccordionItem value="materials">
            <AccordionTrigger className="text-sm tracking-[0.1em] uppercase">
              {t('materials')}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                {materials || '100% Premium Cotton. Ethically sourced and sustainably produced.'}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="care">
            <AccordionTrigger className="text-sm tracking-[0.1em] uppercase">
              {t('care')}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                {care || 'Machine wash cold. Tumble dry low. Do not bleach. Iron on low heat if needed.'}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shipping">
            <AccordionTrigger>
              <span className="flex items-center gap-2 text-sm">
                <Truck size={16} className="text-[var(--color-text-label)]" />
                {t('freeShipping')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                Free standard shipping on all orders. Delivery within 3-5 business days.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cod">
            <AccordionTrigger>
              <span className="flex items-center gap-2 text-sm">
                <CreditCard size={16} className="text-[var(--color-text-label)]" />
                {t('codPolicy')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                Cash on delivery available for orders under $500.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="return">
            <AccordionTrigger>
              <span className="flex items-center gap-2 text-sm">
                <RotateCcw size={16} className="text-[var(--color-text-label)]" />
                {t('returnPolicy')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                Free returns within 30 days. Items must be unworn with tags attached.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

export default ProductInfo;
