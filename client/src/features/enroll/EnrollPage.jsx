import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { CameraView } from '../../components/camera/CameraView.jsx';
import { FaceOverlay } from '../../components/camera/FaceOverlay.jsx';
import { CaptureProgress } from '../../components/camera/CaptureProgress.jsx';
import { EnrollForm } from './EnrollForm.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import {
  loadModels,
  detectFaceWithFeatures,
  evaluateQuality,
  extractBiometricSignature
} from '../../lib/faceEngine.js';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiUserPlus,
  FiUsers
} from 'react-icons/fi';

const REQUIRED_SAMPLES = 8;

export function EnrollPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cameraRef = useRef(null);

  const [step, setStep] = useState(1); // 1 = Biometric Capture, 2 = Student Details, 3 = Complete
  const [modelLoading, setModelLoading] = useState(true);
  const [modelProgress, setModelProgress] = useState(0);

  // Capture loop states
  const [samples, setSamples] = useState([]);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [capturePrompt, setCapturePrompt] = useState('Position face inside the oval');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [lastSampleTime, setLastSampleTime] = useState(0);
  const [enrolledStudent, setEnrolledStudent] = useState(null);

  // Camera device management
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // 1. Initialize models
  useEffect(() => {
    let isMounted = true;
    loadModels(({ progress }) => {
      if (isMounted) setModelProgress(Math.round(progress * 100));
    })
      .then(() => {
        if (isMounted) setModelLoading(false);
      })
      .catch((_err) => {
        if (isMounted) toast.error('Failed to load recognition models.', 'CV Error');
      });

    // Enumerate video devices
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const videoDevs = devs.filter(d => d.kind === 'videoinput');
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    });

    return () => { isMounted = false; };
  }, []);

  // 2. Continuous Detection & Sampling Loop
  useEffect(() => {
    if (step !== 1 || modelLoading) return;

    let animId = null;
    let isRunning = true;
    let lastEvalTime = 0;

    const runLoop = async () => {
      const now = Date.now();
      const videoEl = cameraRef.current?.getVideoElement();

      // Gate loop at ~8 FPS (every 120ms)
      if (videoEl && videoEl.readyState >= 2 && (now - lastEvalTime >= 120)) {
        lastEvalTime = now;
        try {
          const detection = await detectFaceWithFeatures(videoEl, 320);

          if (detection) {
            const quality = evaluateQuality(detection, videoEl);
            setQualityMetrics(quality.metrics);

            // Determine prompt based on sample index
            const count = samples.length;
            let currentTargetPrompt = '';

            if (count < 5) {
              currentTargetPrompt = 'Look straight ahead';
            } else if (count === 5) {
              currentTargetPrompt = 'Turn face slightly LEFT';
            } else if (count === 6) {
              currentTargetPrompt = 'Turn face slightly RIGHT';
            } else {
              currentTargetPrompt = 'Keep still, final sample';
            }
            setCapturePrompt(currentTargetPrompt);

            // Check if sample passes all quality gates
            const canCapture =
              quality.passed &&
              now - lastSampleTime >= 400 && // 400ms spacing rule
              count < REQUIRED_SAMPLES;

            if (canCapture) {
              // Natural head pose guidance
              const sig = extractBiometricSignature(detection);

              const newSample = {
                ...sig,
                quality: quality.score,
                capturedAt: new Date()
              };

              const nextSamples = [...samples, newSample];
              setSamples(nextSamples);
              setLastSampleTime(now);

              // If reached 8 samples, perform duplicate check and advance to Step 2
              if (nextSamples.length >= REQUIRED_SAMPLES) {
                onSamplesComplete(nextSamples);
              }
            }
          } else {
            setQualityMetrics(null);
            setCapturePrompt('Position face inside the oval');
          }
        } catch (_err) {
          // Ignore transient detection frame drops
        }
      }

      if (isRunning && step === 1 && samples.length < REQUIRED_SAMPLES) {
        animId = requestAnimationFrame(runLoop);
      }
    };

    animId = requestAnimationFrame(runLoop);

    return () => {
      isRunning = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [step, modelLoading, samples, lastSampleTime]);

  const onSamplesComplete = async (completedSamples) => {
    // Calculate mean descriptor
    const mean = new Array(128).fill(0);
    for (const s of completedSamples) {
      for (let i = 0; i < 128; i++) mean[i] += s.descriptor[i];
    }
    for (let i = 0; i < 128; i++) mean[i] /= completedSamples.length;

    // Duplicate check API call
    try {
      const dupRes = await api.post('/students/signature?check=1', {
        meanDescriptor: mean
      }, { authRequired: true });

      if (dupRes.isDuplicate && dupRes.match) {
        setDuplicateWarning(dupRes.match);
        toast.warning(
          `Face closely matches existing student ${dupRes.match.name} (Roll: ${dupRes.match.rollNo})!`,
          'Duplicate Face Alert'
        );
      } else {
        setDuplicateWarning(null);
        toast.success('8 Biometric samples captured! Proceeding to details.');
      }
    } catch (_e) {
      setDuplicateWarning(null);
    }

    setStep(2);
  };

  const handleRestart = () => {
    setSamples([]);
    setQualityMetrics(null);
    setDuplicateWarning(null);
    setStep(1);
  };

  const handleEnrollSuccess = (data) => {
    setEnrolledStudent(data);
    setStep(3);
  };

  return (
    <div>
      <PageHeader
        title="Student Biometric Enrollment"
        description="Capture multi-signal Face and Eye signatures, verify quality and duplicate status, and register student details."
      />

      {/* Stepper Wizard Header */}
      <div className="flex items-center justify-between mb-8 max-w-xl">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              step >= 1 ? 'bg-primary text-primary-contrast shadow-sm' : 'bg-surface-2 text-muted'
            }`}
          >
            1
          </div>
          <span className={`text-sm font-semibold ${step >= 1 ? 'text-main' : 'text-muted'}`}>
            Face & Eye Capture
          </span>
        </div>

        <div className="h-0.5 w-12 bg-line" />

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              step >= 2 ? 'bg-primary text-primary-contrast shadow-sm' : 'bg-surface-2 text-muted'
            }`}
          >
            2
          </div>
          <span className={`text-sm font-semibold ${step >= 2 ? 'text-main' : 'text-muted'}`}>
            Student Details
          </span>
        </div>
      </div>

      {/* Step 1: Biometric Capture */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Camera View */}
          <div className="lg:col-span-7">
            <div className="relative aspect-[4/3] rounded-token overflow-hidden shadow-lg border border-line bg-black">
              {modelLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="font-semibold text-sm">Loading Neural Vision Models ({modelProgress}%)</p>
                  <p className="text-xs text-gray-400 mt-1">tinyFaceDetector & faceRecognitionNet</p>
                </div>
              ) : (
                <CameraView
                  ref={cameraRef}
                  mirrored={true}
                  deviceId={selectedDeviceId}
                >
                  <FaceOverlay
                    state={samples.length >= REQUIRED_SAMPLES ? 'recognized' : 'looking'}
                    prompt={capturePrompt}
                  />
                </CameraView>
              )}
            </div>

            {/* Camera controls */}
            <div className="flex items-center justify-between mt-3 px-1">
              {devices.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted">Camera:</span>
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-surface border border-line rounded px-2 py-1 text-xs text-main"
                  >
                    {devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button size="sm" variant="secondary" onClick={handleRestart}>
                <FiRefreshCw className="w-3.5 h-3.5 mr-1" />
                Reset Samples
              </Button>
            </div>
          </div>

          {/* Right Metrics & Progress Panel */}
          <div className="lg:col-span-5 space-y-4">
            <CaptureProgress
              current={samples.length}
              total={REQUIRED_SAMPLES}
              message={capturePrompt}
            />

            {/* Quality Meter Gates */}
            <Card>
              <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-3">
                Biometric Quality Gates
              </h4>
              <div className="space-y-2.5 text-xs">
                {/* 1. Face Size */}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Face Frame Size (&ge; 30%)</span>
                  <span className={`font-semibold ${qualityMetrics?.isSizeGood ? 'text-success' : 'text-danger'}`}>
                    {qualityMetrics ? `${qualityMetrics.heightRatio}%` : '--'}
                  </span>
                </div>

                {/* 2. Eyes Open (EAR) */}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Eyes Open (EAR &ge; 0.20)</span>
                  <span className={`font-semibold ${qualityMetrics?.isEyesOpen ? 'text-success' : 'text-danger'}`}>
                    {qualityMetrics ? `${qualityMetrics.ear}` : '--'}
                  </span>
                </div>

                {/* 3. Lighting / Brightness */}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Illumination (50 - 220)</span>
                  <span className={`font-semibold ${qualityMetrics?.isLightingGood ? 'text-success' : 'text-danger'}`}>
                    {qualityMetrics ? `${qualityMetrics.brightness}` : '--'}
                  </span>
                </div>

                {/* 4. Sharpness Variance */}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Sharpness Variance (&ge; 15)</span>
                  <span className={`font-semibold ${qualityMetrics?.isSharp ? 'text-success' : 'text-danger'}`}>
                    {qualityMetrics ? `${qualityMetrics.sharpness}` : '--'}
                  </span>
                </div>

                {/* 5. Head Yaw Pose */}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Head Pose (Yaw Angle)</span>
                  <span className="font-semibold text-main font-mono">
                    {qualityMetrics ? `${qualityMetrics.yaw}°` : '--'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Sample thumbnails strip */}
            <Card>
              <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">
                Captured Samples ({samples.length}/{REQUIRED_SAMPLES})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: REQUIRED_SAMPLES }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-14 rounded-token border flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      i < samples.length
                        ? 'border-success bg-success/10 text-success'
                        : 'border-dashed border-line text-muted'
                    }`}
                  >
                    {i < samples.length ? (
                      <>
                        <FiCheckCircle className="w-4 h-4 mb-0.5" />
                        <span className="text-[10px]">Sample {i + 1}</span>
                      </>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Student Details Form */}
      {step === 2 && (
        <div className="max-w-2xl bg-surface border border-line rounded-token p-6 sm:p-8 shadow-sm">
          {duplicateWarning && (
            <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-token flex items-start gap-3 text-warning text-xs sm:text-sm">
              <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Duplicate Biometric Signature Warning</p>
                <p className="mt-0.5">
                  This face closely matches enrolled student <span className="font-semibold underline">{duplicateWarning.name}</span> (Roll: {duplicateWarning.rollNo}) with distance {duplicateWarning.distance}. Saving may result in duplicate records.
                </p>
              </div>
            </div>
          )}

          <EnrollForm
            samples={samples}
            onEnrollSuccess={handleEnrollSuccess}
            onReset={handleRestart}
          />
        </div>
      )}

      {/* Step 3: Success Screen */}
      {step === 3 && (
        <Card className="max-w-md mx-auto text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
            <FiCheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-main font-poppins">Enrollment Successful!</h3>
          {enrolledStudent?.name && (
            <p className="font-semibold text-primary">{enrolledStudent.name} (Roll: {enrolledStudent.rollNo})</p>
          )}
          <p className="text-sm text-muted">
            The student&apos;s Face and Eye Biometric Signature and profile have been permanently saved in Cloud Firestore.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="primary" onClick={handleRestart}>
              <FiUserPlus className="w-4 h-4 mr-2" />
              Enroll Another Student
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/students')}>
              <FiUsers className="w-4 h-4 mr-2" />
              View Students Directory
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
