"use client";

import { useCallback, useRef, useState } from "react";

interface Garment {
  id: string;
  image_url: string;
  category: string;
  name: string | null;
  detail_urls?: string[];
}

interface Props {
  garment: Garment;
  firebaseUid: string;
  onClose: () => void;
  onUpdate: (updated: Garment) => void;
  onDelete: (id: string) => void;
}

const GARMENT_CATEGORIES = ['トップス', 'アウター', 'パンツ', 'スカート', 'ワンピース', 'シューズ', 'バッグ', 'アクセサリー', 'その他'];

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target?.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function uploadDetailImage(dataUrl: string, uid: string, garmentId: string, idx: number): Promise<string | null> {
  // We reuse the garments POST endpoint but just for uploading the image
  const res = await fetch('/api/my/garments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebaseUid: uid,
      items: [{ imageDataUrl: dataUrl, category: '_detail_tmp_', name: `detail-${garmentId}-${idx}` }],
    }),
  });
  const d = await res.json();
  return d.garments?.[0]?.image_url ?? null;
}

export function GarmentDetailModal({ garment, firebaseUid, onClose, onUpdate, onDelete }: Props) {
  const [category, setCategory] = useState(garment.category);
  const [detailUrls, setDetailUrls] = useState<(string | null)[]>([
    garment.detail_urls?.[0] ?? null,
    garment.detail_urls?.[1] ?? null,
    garment.detail_urls?.[2] ?? null,
  ]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detailCount = detailUrls.filter(Boolean).length;
  const totalCount = 1 + detailCount;

  const handleDetailDrop = useCallback(async (idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(idx);
    try {
      const dataUrl = await toBase64(files[0]);
      const url = await uploadDetailImage(dataUrl, firebaseUid, garment.id, idx);
      if (url) {
        setDetailUrls((prev) => {
          const next = [...prev];
          next[idx] = url;
          return next;
        });
      }
    } finally {
      setUploading(null);
      setDragOverIdx(null);
    }
  }, [firebaseUid, garment.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/my/garments/${garment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid,
          category,
          detailUrls: detailUrls.filter(Boolean),
        }),
      });
      const d = await res.json();
      if (d.garment) {
        onUpdate({ ...d.garment, detail_urls: d.garment.detail_urls ?? [] });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await fetch(`/api/my/garments/${garment.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid }),
    });
    onDelete(garment.id);
    onClose();
  };

  const removeDetail = (idx: number) => {
    setDetailUrls((prev) => { const next = [...prev]; next[idx] = null; return next; });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', fontFamily: MONO }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl overflow-y-auto"
        style={{ background: 'var(--vault-bg)', maxHeight: '92dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--vault-border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[3px]" style={{ color: 'var(--vault-text-dim)' }}>ITEM</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-[10px] tracking-[2px] bg-transparent border-none outline-none cursor-pointer"
              style={{ color: 'var(--vault-text)', appearance: 'auto' }}
            >
              {GARMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button onClick={onClose} style={{ color: 'var(--vault-text-dim)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Main image */}
          <div
            className="relative w-full rounded overflow-hidden"
            style={{ aspectRatio: '3/4', background: 'var(--vault-border)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garment.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>

          {/* Detail slots */}
          <div className="grid grid-cols-3 gap-[3px]">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="relative rounded overflow-hidden"
                style={{
                  aspectRatio: '1/1',
                  background: dragOverIdx === idx ? 'var(--vault-cyan-dim)' : 'var(--vault-border)',
                  border: dragOverIdx === idx ? '1px dashed var(--vault-cyan)' : '1px dashed transparent',
                  transition: 'background 0.15s',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => { e.preventDefault(); handleDetailDrop(idx, e.dataTransfer.files); }}
              >
                {detailUrls[idx] ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detailUrls[idx]!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      onClick={() => removeDetail(idx)}
                      className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(160,0,0,0.7)' }}
                    >
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : uploading === idx ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'var(--vault-text-dim)', borderTopColor: 'transparent' }} />
                  </div>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-[8px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>DET {idx + 1}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDetailDrop(idx, e.target.files)}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          {/* Count */}
          <p className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
            {totalCount} / 4 枚
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 text-[10px] tracking-[3px] transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
            >
              {saving ? '...' : 'SAVE'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 text-[10px] tracking-[2px] transition-opacity hover:opacity-70"
              style={{
                background: confirmDelete ? 'rgba(160,0,0,0.15)' : 'var(--vault-border)',
                color: confirmDelete ? 'rgb(160,0,0)' : 'var(--vault-text-dim)',
              }}
            >
              {confirmDelete ? '確認' : '削除'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
