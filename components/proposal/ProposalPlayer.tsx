// 縦長の見本動画（Cloudflare Stream の埋め込み）。最初は音なしで自動再生し、操作バーで音を出せる。
const STREAM_HOST = 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com';

export function ProposalPlayer({ streamId, title }: { streamId: string; title: string }) {
  const src = `${STREAM_HOST}/${streamId}/iframe?autoplay=true&muted=true&loop=true&preload=auto&poster=${encodeURIComponent(
    `${STREAM_HOST}/${streamId}/thumbnails/thumbnail.jpg?time=1s&height=1280`,
  )}`;
  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '9 / 16' }}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
