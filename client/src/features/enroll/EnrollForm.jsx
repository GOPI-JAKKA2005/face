import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { studentSchema } from '../../lib/validate.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ImageDropzone } from '../../components/media/ImageDropzone.jsx';
import { TimeSlotConfig } from '../../components/students/TimeSlotConfig.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { FiCheckCircle, FiUser, FiHash, FiPhone, FiLayers } from 'react-icons/fi';

export function EnrollForm({ samples, _meanSignature, onEnrollSuccess, onReset }) {
  const { toast } = useToast();
  const [photoData, setPhotoData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [timeSlot, setTimeSlot] = useState({
    enabled: false,
    loginTime: '10:00',
    logoutTime: '19:30',
    graceMinutes: 5,
    slotLabel: '10:00 AM - 07:30 PM Shift'
  });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(studentSchema),
    defaultValues: {
      name: '',
      rollNo: '',
      mobile: '',
      className: '',
      consent: false
    }
  });

  const onSubmit = async (formData) => {
    if (!samples || samples.length < 5) {
      toast.error('At least 5 biometric face samples must be captured in Step 1.');
      return;
    }

    setSaving(true);
    try {
      let uploadedPhotoUrl = null;
      if (photoData?.dataUrl) {
        // Upload photo via serverless media route
        try {
          const res = await api.post('/media/upload-image', {
            title: `Profile - ${formData.name}`,
            dataBase64: photoData.dataUrl
          }, { authRequired: true });
          uploadedPhotoUrl = res.url;
        } catch (_uploadErr) {
          console.warn('Photo upload failed; proceeding with enrollment:', _uploadErr);
        }
      }

      const payload = {
        name: formData.name,
        rollNo: formData.rollNo.toUpperCase().trim(),
        mobile: formData.mobile.replace(/\s+/g, ''),
        className: formData.className || '',
        photoUrl: uploadedPhotoUrl,
        timeSlot: timeSlot.enabled ? timeSlot : null,
        consent: true,
        samples: samples.map(s => ({
          descriptor: s.descriptor,
          eye: s.eye,
          quality: s.quality || 1
        }))
      };

      const result = await api.post('/students', payload, { authRequired: true });
      toast.success(`Student ${formData.name} enrolled successfully!`, 'Enrollment Complete');
      onEnrollSuccess(result);
    } catch (err) {
      toast.error(err.message || 'Failed to enroll student.', 'Enrollment Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="p-3.5 bg-success/10 border border-success/30 rounded-token flex items-center gap-2.5 text-xs text-success font-medium">
        <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
        <span>
          Step 1 Complete: {samples.length} biometric samples captured & verified with Face and Eye Signature.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Student Full Name"
          icon={FiUser}
          placeholder="e.g. Aditi Sharma"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Roll Number"
          icon={FiHash}
          placeholder="e.g. CS-101"
          error={errors.rollNo?.message}
          {...register('rollNo')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Mobile Number (India, 10 Digits)"
          icon={FiPhone}
          placeholder="98765 43210"
          error={errors.mobile?.message}
          {...register('mobile')}
        />

        <Input
          label="Class / Batch (Optional)"
          icon={FiLayers}
          placeholder="e.g. Class 12-A / Batch 2026"
          error={errors.className?.message}
          {...register('className')}
        />
      </div>

      {/* Individual Time Slot / Shift Config */}
      <TimeSlotConfig value={timeSlot} onChange={setTimeSlot} />

      {/* Profile Photo Dropzone */}
      <ImageDropzone
        label="Optional Profile Photo"
        squareCrop={true}
        onImageReady={(data) => setPhotoData(data)}
      />

      {/* Privacy Consent Checkbox (Hard Constraint 8.4) */}
      <div className="p-4 bg-surface-2 rounded-token border border-line">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 rounded text-primary focus:ring-primary w-4 h-4 border-line bg-surface"
            {...register('consent')}
          />
          <div className="text-xs text-main leading-relaxed select-none">
            <span className="font-semibold block mb-0.5">Biometric Privacy & Consent Notice</span>
            I certify that the student has been informed of and consented to the collection of facial and eye geometric biometric descriptors for identity and attendance verification.
          </div>
        </label>
        {errors.consent && (
          <p className="mt-1.5 text-xs text-danger font-medium">{errors.consent.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        <Button variant="secondary" onClick={onReset} disabled={saving}>
          Restart Capture
        </Button>
        <Button type="submit" variant="primary" loading={saving} size="lg">
          Save Student & Signature
        </Button>
      </div>
    </form>
  );
}
