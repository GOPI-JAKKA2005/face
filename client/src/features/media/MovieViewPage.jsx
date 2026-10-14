import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MovieViewer } from '../../components/media/MovieViewer.jsx';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { FiArrowLeft, FiFilm, FiUsers } from 'react-icons/fi';

export function MovieViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAttendanceReel, setIsAttendanceReel] = useState(false);

  useEffect(() => {
    async function loadMedia() {
      try {
        if (isAttendanceReel) {
          // Load today's recognized students for Attendance Reel
          const res = await api.get('/attendance/list?limit=50', { authRequired: true });
          const reelItems = (res.records || []).map(r => ({
            id: r.id,
            title: r.name,
            rollNo: r.rollNo,
            photoUrl: r.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=4F46E5&color=fff&size=512`,
            kind: 'image',
            status: r.status,
            createdAt: r.markedAt
          }));
          setItems(reelItems);
        } else {
          const res = await api.get('/media/video', { authRequired: true });
          setItems(res.media || []);
        }
      } catch (err) {
        console.error('Failed to load movie view media:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMedia();
  }, [isAttendanceReel]);

  const initialIndex = id ? Math.max(0, items.findIndex(m => m.id === id)) : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#06060c] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wider uppercase font-poppins">Loading Cinematic Stage...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#06060c] flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
        <FiFilm className="w-12 h-12 text-muted" />
        <h3 className="text-xl font-bold font-poppins">No Media In Gallery</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          {isAttendanceReel
            ? 'No students have checked in today yet to build an attendance reel.'
            : 'Upload videos or profile images in the Media Library to enjoy cinematic Movie View.'}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/media')}>
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Media Library
          </Button>
          {!isAttendanceReel && (
            <Button variant="accent" onClick={() => setIsAttendanceReel(true)}>
              <FiUsers className="w-4 h-4 mr-2" />
              Try Today&apos;s Attendance Reel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <MovieViewer
      items={items}
      initialIndex={initialIndex >= 0 ? initialIndex : 0}
      onClose={() => navigate('/admin/media')}
    />
  );
}
