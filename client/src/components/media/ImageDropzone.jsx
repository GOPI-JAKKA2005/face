import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiX } from 'react-icons/fi';
import { compressImageUnderCeiling } from '../../lib/compressImage.js';
import { CompressionStatus } from './CompressionStatus.jsx';

export function ImageDropzone({
  onImageReady = () => {},
  squareCrop = false,
  label = 'Upload Image',
  className = ''
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);

  const processFile = async (file) => {
    if (!file) return;
    setError(null);

    if (file.size > 50 * 1024 * 1024) {
      setError('File exceeds maximum safety size limit of 50 MB.');
      return;
    }

    setCompressing(true);
    try {
      const result = await compressImageUnderCeiling(file, { squareCrop });
      setPreview(result.dataUrl);
      setStats({ original: result.originalBytes, final: result.finalBytes });
      onImageReady(result);
    } catch (err) {
      setError(err.message || 'Image compression failed.');
    } finally {
      setCompressing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setPreview(null);
    setStats(null);
    setError(null);
    onImageReady(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-xs font-semibold text-main uppercase tracking-wider">{label}</label>}

      {preview ? (
        <div className="relative border border-line rounded-token p-3 bg-surface flex items-center gap-3">
          <img
            src={preview}
            alt="Upload preview"
            className={`w-16 h-16 object-cover border border-line ${squareCrop ? 'rounded-full' : 'rounded-token'}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-main">Image ready for upload</p>
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
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-token p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-line hover:border-primary/50 bg-surface'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            onChange={(e) => processFile(e.target.files?.[0])}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-surface-2 text-muted flex items-center justify-center mx-auto mb-2">
            <FiUploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-main">Click or drag image to upload</p>
          <p className="text-[10px] text-muted mt-1">JPEG, PNG, WebP (auto-compressed &lt; 500 KB)</p>
        </button>
      )}

      <CompressionStatus
        compressing={compressing}
        originalBytes={stats?.original}
        finalBytes={stats?.final}
        error={error}
      />
    </div>
  );
}
