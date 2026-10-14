import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { FiHome, FiAlertCircle } from 'react-icons/fi';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
        <FiAlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-main font-poppins">404 - Page Not Found</h1>
      <p className="text-sm text-muted max-w-sm mt-2 mb-6">
        The destination you requested does not exist or has been relocated.
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => navigate('/admin')}>
          <FiHome className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
        <Button variant="secondary" onClick={() => navigate('/kiosk')}>
          Open Kiosk
        </Button>
      </div>
    </div>
  );
}
