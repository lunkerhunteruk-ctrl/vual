'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, Loader2, Film, AlertCircle, Download } from 'lucide-react';

const STUDIO_PASSCODE = process.env.NEXT_PUBLIC_STUDIO_TOOLS_PASSCODE || 'vual-studio';

const DURATIONS = [4, 6, 8] as const;
const ASPECTS = [
  { value: '16:9', label: '16:9 横長' },
  { value: '9:16', label: '9:16 縦長' },
] as const;
const MODELS = [
  { value: 'veo3', label: 'Quality', hint: '最高画質' },
  { value: 'veo3_fast', label: 'Fast', hint: '安い・高速' },
  { value: 'veo3_lite', label: 'Lite', hint: '最安' },
] as const;

const POLL_INTERVAL_MS = 8000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000; // 6 min
const HISTORY_KEY = 'vg-history';
const HISTORY_LIMIT = 30;

type JobStatus = 'generating' | 'done' | 'error';

interface Job {
  localId: string;
  taskId: string | null;
  prompt: string;
  aspect: string;
  duration: number;
  model: string;
  status: JobStatus;
  videoUrl: string | null;
  error: string | null;
}

const downloadHref = (taskId: string) =>
  `/api/video-generator/download?taskId=${encodeURIComponent(taskId)}&passcode=${encodeURIComponent(STUDIO_PASSCODE)}`;

export default function VideoGeneratorPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(8);
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]['value']>('9:16');
  const [model, setModel] = useState<(typeof MODELS)[number]['value']>('veo3');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  // Merge a partial update into one job by localId.
  const updateJob = useCallback((localId: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.localId === localId ? { ...j, ...patch } : j)));
  }, []);

  const poll = useCallback((localId: string, taskId: string, startedAt: number) => {
    const tick = async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        updateJob(localId, { status: 'error', error: 'タイムアウトしました（6分）。' });
        return;
      }
      try {
        const res = await fetch(
          `/api/video-generator/status?taskId=${encodeURIComponent(taskId)}&passcode=${encodeURIComponent(STUDIO_PASSCODE)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ステータス取得に失敗');

        if (data.status === 'success' && data.videoUrls?.[0]) {
          updateJob(localId, { status: 'done', videoUrl: data.videoUrls[0] });
          return;
        }
        if (data.status === 'failed') {
          updateJob(localId, { status: 'error', error: data.errorMessage || '生成に失敗しました。' });
          return;
        }
        setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err: any) {
        updateJob(localId, { status: 'error', error: err.message || 'ステータス取得に失敗' });
      }
    };
    setTimeout(tick, POLL_INTERVAL_MS);
  }, [updateJob]);

  // Restore history from localStorage on mount, and resume polling for any
  // job that was still generating when the app was last closed.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const saved: Job[] = JSON.parse(raw);
      // Generating jobs with no taskId never really started — mark them errored.
      const normalized = saved.map((j) =>
        j.status === 'generating' && !j.taskId
          ? { ...j, status: 'error' as JobStatus, error: '中断されました' }
          : j,
      );
      setJobs(normalized);
      normalized.forEach((j) => {
        if (j.status === 'generating' && j.taskId) poll(j.localId, j.taskId, Date.now());
      });
    } catch {
      // ignore corrupt history
    }
  }, [poll]);

  // Persist history whenever it changes (skip the very first empty render).
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(jobs.slice(0, HISTORY_LIMIT)));
    } catch {
      // storage full / unavailable — non-fatal
    }
  }, [jobs]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const setFile = useCallback((file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }, [imagePreview]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) setFile(file);
  }, [setFile]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);

    const localId =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const job: Job = {
      localId,
      taskId: null,
      prompt: prompt.trim(),
      aspect,
      duration,
      model,
      status: 'generating',
      videoUrl: null,
      error: null,
    };
    // Prepend so the newest is on top; older results stay below (scrollable).
    setJobs((prev) => [job, ...prev]);

    try {
      const form = new FormData();
      form.append('prompt', prompt.trim());
      form.append('duration', String(duration));
      form.append('aspectRatio', aspect);
      form.append('model', model);
      form.append('passcode', STUDIO_PASSCODE);
      if (image) form.append('image', image);

      const res = await fetch('/api/video-generator/generate', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成リクエストに失敗');

      updateJob(localId, { taskId: data.taskId });
      poll(localId, data.taskId, Date.now());
    } catch (err: any) {
      updateJob(localId, { status: 'error', error: err.message || '生成リクエストに失敗' });
    } finally {
      setSubmitting(false);
    }
  }, [prompt, duration, aspect, model, image, submitting, poll, updateJob]);

  const removeJob = useCallback((localId: string) => {
    setJobs((prev) => prev.filter((j) => j.localId !== localId));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="mb-8 flex items-center gap-3">
          <Film className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#fff' }}>Video Generator</h1>
            <p className="text-sm text-neutral-400">Veo 3.1 · Kie.ai — 画像＋プロンプトから動画を生成</p>
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* ── Left: controls ── */}
          <div className="space-y-6">
            {/* Image dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex aspect-video cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition
                ${dragging ? 'border-violet-400 bg-violet-500/10' : 'border-neutral-700 hover:border-neutral-500'}`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="input" className="h-full w-full rounded-xl object-contain" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 hover:bg-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-400">
                  <Upload className="h-8 w-8" />
                  <p className="text-sm">画像をドラッグ＆ドロップ</p>
                  <p className="text-xs text-neutral-500">またはクリックして選択（任意）</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Prompt */}
            <div>
              <label className="mb-2 block text-sm font-medium">プロンプト</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="例: モデルがランウェイを歩く、シネマティックな照明、ゆっくりとしたカメラワーク"
                className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-violet-400"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mb-2 block text-sm font-medium">尺</label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition
                      ${duration === d ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                  >
                    {d}秒
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div>
              <label className="mb-2 block text-sm font-medium">アスペクト比</label>
              <div className="flex gap-2">
                {ASPECTS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAspect(a.value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition
                      ${aspect === a.value ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="mb-2 block text-sm font-medium">モデル</label>
              <div className="flex gap-2">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition
                      ${model === m.value ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                  >
                    <div>{m.label}</div>
                    <div className="text-[10px] text-neutral-500">{m.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Film className="h-5 w-5" />}
              {submitting ? '送信中…' : '動画を生成'}
            </button>
            <p className="text-center text-xs text-neutral-600">
              生成中も続けて作成できます。結果は右に積み上がります。
            </p>
          </div>

          {/* ── Right: results history ── */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            {jobs.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-neutral-600">
                <Film className="h-10 w-10" />
                <p className="text-sm">ここに生成結果が積み上がります</p>
              </div>
            ) : (
              <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
                {jobs.map((job) => (
                  <ResultCard key={job.localId} job={job} onRemove={removeJob} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ job, onRemove }: { job: Job; onRemove: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-xs text-neutral-400">{job.prompt}</p>
        <button
          onClick={() => onRemove(job.localId)}
          className="shrink-0 rounded p-1 text-neutral-500 hover:text-neutral-300"
          title="リストから削除"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] text-neutral-500">
        <span className="rounded bg-neutral-800 px-1.5 py-0.5">{job.aspect}</span>
        <span className="rounded bg-neutral-800 px-1.5 py-0.5">{job.duration}秒</span>
        <span className="rounded bg-neutral-800 px-1.5 py-0.5">{job.model}</span>
      </div>

      {job.status === 'done' && job.videoUrl ? (
        <div className="space-y-2">
          <video
            src={job.videoUrl}
            controls
            loop
            className={`w-full rounded-lg bg-black ${job.aspect === '9:16' ? 'mx-auto max-h-[60vh] w-auto' : ''}`}
          />
          {job.taskId && (
            <a
              href={downloadHref(job.taskId)}
              className="flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500"
            >
              <Download className="h-4 w-4" /> ダウンロード
            </a>
          )}
        </div>
      ) : job.status === 'error' ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{job.error}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 rounded-lg bg-neutral-900 px-3 py-8 text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          <span className="text-sm">生成中… 1〜数分</span>
        </div>
      )}
    </div>
  );
}
