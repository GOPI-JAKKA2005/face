import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { FiCameraOff, FiRefreshCw } from 'react-icons/fi';
import { Button } from '../ui/Button.jsx';

export const CameraView = forwardRef(function CameraView(
  {
    mirrored = true,
    deviceId = null,
    onReady = () => {},
    onError = () => {},
    className = '',
    children
  },
  ref
) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    getStream: () => stream,
    captureFrame: () => {
      if (!videoRef.current) return null;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (mirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.9);
    }
  }));

  const startCamera = async () => {
    setErrorMessage(null);
    setHasPermission(true);

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    try {
      const constraints = {
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        const triggerReady = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => console.warn('Play interrupted:', e));
            onReady(videoRef.current);
          }
        };

        videoRef.current.onloadedmetadata = triggerReady;
        videoRef.current.oncanplay = triggerReady;
        videoRef.current.onplaying = triggerReady;

        if (videoRef.current.readyState >= 1) {
          triggerReady();
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings to continue.'
          : `Failed to access camera: ${err.message}`
      );
      onError(err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [deviceId]);

  return (
    <div className={`relative overflow-hidden bg-black rounded-token flex items-center justify-center ${className}`}>
      {hasPermission ? (
        <video
          ref={videoRef}
          playsInline
          webkit-playsinline="true"
          muted
          autoPlay
          className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-200 ${
            mirrored ? 'scale-x-[-1]' : ''
          }`}
        />
      ) : (
        <div className="p-8 text-center max-w-md mx-auto text-white space-y-4">
          <div className="w-16 h-16 rounded-full bg-danger/20 text-danger flex items-center justify-center mx-auto">
            <FiCameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">Camera Permission Required</h3>
          <p className="text-xs sm:text-sm text-gray-300">{errorMessage}</p>
          <Button variant="primary" onClick={startCamera}>
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Retry Camera Access
          </Button>
        </div>
      )}

      {/* Overlays and guides */}
      {hasPermission && children}
    </div>
  );
});
