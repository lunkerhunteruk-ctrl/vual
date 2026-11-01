// LATITUDE のページの静止画。対応していれば軽い AVIF・WebP を、だめなら元の JPEG を出す（scripts/latitude-optimize.py で横に作ってある）
// photo：「その街のいま」が夜の時にうすく暗く・青くする写真の印（data-lat-photo）。動くページ・拡大写真には付けない
export function Pic({ src, alt, eager = false, className = '', photo = false }: { src: string; alt: string; eager?: boolean; className?: string; photo?: boolean }) {
  const base = src.replace(/\.jpg$/, '');
  return (
    <picture className="block h-full w-full" data-lat-photo={photo ? '' : undefined}>
      <source type="image/avif" srcSet={`${base}.avif`} />
      <source type="image/webp" srcSet={`${base}.webp`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className} />
    </picture>
  );
}
