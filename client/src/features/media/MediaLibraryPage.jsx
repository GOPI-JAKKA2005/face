import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { ImageDropzone } from '../../components/media/ImageDropzone.jsx';
import { VideoDropzone } from '../../components/media/VideoDropzone.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDateDisplay } from '../../lib/time.js';
import {
  FiFilm,
  FiUpload,
  FiFolder,
  FiPlay,
  FiTrash2,
  FiEye,
  FiImage,
  FiVideo
} from 'react-icons/fi';

export function MediaLibraryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState('all'); // 'all' | 'image' | 'video'
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState('image');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadData, setUploadData] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media/video', { authRequired: true });
      setMediaList(res.media || []);
    } catch (_err) {
      toast.error('Failed to load media assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUploadSubmit = async () => {
    if (!uploadData) {
      toast.warning('Please select and compress a file first.');
      return;
    }

    setUploading(true);
    try {
      if (uploadType === 'image') {
        await api.post('/media/upload-image', {
          title: uploadTitle || 'Uploaded Photo',
          dataBase64: uploadData.dataUrl
        }, { authRequired: true });
      } else {
        await api.post('/media/video', {
          title: uploadTitle || 'Uploaded Clip',
          dataBase64: uploadData.base64,
          posterBase64: uploadData.posterBase64,
          durationSec: uploadData.durationSec
        }, { authRequired: true });
      }

      toast.success('Media uploaded and stored successfully!');
      setUploadModalOpen(false);
      setUploadData(null);
      setUploadTitle('');
      fetchMedia();
    } catch (err) {
      toast.error(err.message || 'Media upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/media/video?id=${id}`, { authRequired: true });
      setMediaList(prev => prev.filter(m => m.id !== id));
      toast.success('Media removed.');
    } catch (err) {
      toast.error('Failed to delete media.');
    }
  };

  const filteredMedia = mediaList.filter(m => {
    if (filterKind === 'image') return m.kind === 'image';
    if (filterKind === 'video') return m.kind === 'video';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Cinematic assets, compressed face profiles, and entrance clips strictly guaranteed under the 500 KB limit."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/movie')}>
              <FiFilm className="w-4 h-4 mr-1.5" />
              Open Movie View
            </Button>
            <Button variant="primary" size="sm" onClick={() => setUploadModalOpen(true)}>
              <FiUpload className="w-4 h-4 mr-1.5" />
              Upload Asset
            </Button>
          </>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-token border border-line max-w-xs">
        {[
          { id: 'all', label: 'All Files' },
          { id: 'image', label: 'Images' },
          { id: 'video', label: 'Clips (Video)' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterKind(tab.id)}
            className={`w-full py-1.5 text-xs font-semibold rounded-token transition-colors ${
              filterKind === tab.id ? 'bg-surface text-main shadow-sm' : 'text-muted hover:text-main'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-44 rounded-token" />
          <Skeleton className="h-44 rounded-token" />
          <Skeleton className="h-44 rounded-token" />
          <Skeleton className="h-44 rounded-token" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <EmptyState
          icon={FiFolder}
          title="No media assets"
          description="Upload student profile pictures or short kiosk video clips."
          action={
            <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
              Upload First Asset
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map(item => (
            <Card key={item.id} padding="p-0" className="overflow-hidden group">
              <button
                type="button"
                onClick={() => navigate(`/admin/movie/${item.id}`)}
                className="w-full text-left relative aspect-video bg-black/80 flex items-center justify-center cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {item.kind === 'video' ? (
                  <>
                    <img
                      src={item.posterBase64 || item.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <FiPlay className="w-5 h-5 ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                <div className="absolute top-2 left-2">
                  <Badge variant={item.kind === 'video' ? 'accent' : 'primary'} size="sm">
                    {item.kind === 'video' ? 'Video' : 'Image'}
                  </Badge>
                </div>
              </button>

              <div className="p-3">
                <h4 className="font-semibold text-xs text-main truncate font-poppins">{item.title}</h4>
                <div className="flex items-center justify-between text-[11px] text-muted font-mono mt-1">
                  <span>{item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : '< 500 KB'}</span>
                  <span>{formatDateDisplay(item.createdAt)}</span>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-line mt-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/movie/${item.id}`)}
                    className="p-1 text-muted hover:text-primary transition-colors"
                    title="Cinematic View"
                  >
                    <FiEye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-muted hover:text-danger transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Media Asset (< 500 KB Guarantee)"
        description="Images and clips are automatically compressed inside your browser before upload."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1 bg-surface-2 rounded-token border border-line">
            <button
              type="button"
              onClick={() => { setUploadType('image'); setUploadData(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-token transition-colors flex items-center justify-center gap-1.5 ${
                uploadType === 'image' ? 'bg-surface text-main shadow-sm' : 'text-muted'
              }`}
            >
              <FiImage className="w-4 h-4" />
              <span>Image</span>
            </button>
            <button
              type="button"
              onClick={() => { setUploadType('video'); setUploadData(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-token transition-colors flex items-center justify-center gap-1.5 ${
                uploadType === 'video' ? 'bg-surface text-main shadow-sm' : 'text-muted'
              }`}
            >
              <FiVideo className="w-4 h-4" />
              <span>Video Clip</span>
            </button>
          </div>

          <Input
            label="Asset Title"
            placeholder="e.g. Campus Entrance Sample"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />

          {uploadType === 'image' ? (
            <ImageDropzone onImageReady={(data) => setUploadData(data)} />
          ) : (
            <VideoDropzone onVideoReady={(data) => setUploadData(data)} />
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button variant="secondary" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={uploading}
              disabled={!uploadData}
              onClick={handleUploadSubmit}
            >
              Confirm Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
