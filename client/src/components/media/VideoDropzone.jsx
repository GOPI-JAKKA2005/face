import React, { useState, useRef } from 'react';
import { FiVideo, FiX } from 'react-icons/fi';
import { compressVideoUnderCeiling } from '../../lib/compressVideo.js';
import { CompressionStatus } from './CompressionStatus.jsx';

export function VideoDropzone({ onVideoReady = () => {}, label = 'Upload Short Clip (Max 8s)', className = '' }) {
  const fileInputRef = useRef(null);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);

  const processFile = async (file) => {
    if (!file) return;
    setError(null);
    setProgress(0);

    if (file.size > 50 * 1024 * 1024) {
      setError('Video file exceeds maximum input ceiling of 50 MB.');
      return;
    }

    setCompressing(true);
    try {
      const result = await compressVideoUnderCeiling(file, {
        onProgress: (pct) => setProgress(pct)
      });
      setPreview(result.posterBase64);
      setStats({ original: result.originalBytes, final: result.finalBytes });
      onVideoReady(result);
    } catch (err) {
      setError(err.message || 'Video compression failed.');
    } finally {
      setCompressing(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setPreview(null);
    setStats(null);
    setError(null);
    onVideoReady(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-xs font-semibold text-main uppercase tracking-wider">{label}</label>}

      {preview ? (
        <div className="relative border border-line rounded-token p-3 bg-surface flex items-center gap-3">
          <img
            src={preview}
            alt="Video poster preview"
            className="w-16 h-16 object-cover border border-line rounded-token"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-main">Video clip compressed</p>
            {stats && (
              <p className="text-[11px] text-muted font-mono mt-0.5">
                {Math.round(stats.original / 1024)} KB → {Math.round(stats.final / 1024)} KB
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-muted hover:text-danger rounded hover:bg-surface-2 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-token p-6 text-center cursor-pointer border-line hover:border-primary/50 bg-surface transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm"
            capture="environment"
            onChange={(e) => processFile(e.target.files?.[0])}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-surface-2 text-muted flex items-center justify-center mx-auto mb-2">
            <FiVideo className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-main">Click or drop short video clip</p>
          <p className="text-[10px] text-muted mt-1">MP4 / WebM (max 8s, encoded &lt; 500 KB)</p>
        </button>
      )}

      <CompressionStatus
        compressing={compressing}
        progress={progress}
        originalBytes={stats?.original}
        finalBytes={stats?.final}
        error={error}
      />
    </div>
  );
}
