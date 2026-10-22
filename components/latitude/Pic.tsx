// LATITUDE のページの静止画。対応していれば軽い AVIF・WebP を、だめなら元の JPEG を出す（scripts/latitude-optimize.py で横に作ってある）
export function Pic({ src, alt, eager = false, className = '' }: { src: string; alt: string; eager?: boolean; className?: string }) {
  const base = src.replace(/\.jpg$/, '');
  return (
    <picture className="block h-full w-full">
      <source type="image/avif" srcSet={`${base}.avif`} />
      <source type="image/webp" srcSet={`${base}.webp`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
    </picture>
  );
}
