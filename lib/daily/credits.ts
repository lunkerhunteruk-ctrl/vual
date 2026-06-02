export interface CreditPack {
  slug: string;
  name: string;
  credits: number;
  priceJpy: number;
  unitPrice: number;
  discount: string | null;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    slug: "pack-10",
    name: "10 Credits",
    credits: 10,
    priceJpy: 500,
    unitPrice: 50,
    discount: null,
  },
  {
    slug: "pack-30",
    name: "30 Credits",
    credits: 30,
    priceJpy: 1200,
    unitPrice: 40,
    discount: "20%OFF",
  },
  {
    slug: "pack-100",
    name: "100 Credits",
    credits: 100,
    priceJpy: 3000,
    unitPrice: 30,
    discount: "40%OFF",
  },
];
