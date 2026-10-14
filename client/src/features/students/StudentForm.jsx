import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { TimeSlotConfig } from '../../components/students/TimeSlotConfig.jsx';
import { useToast } from '../../hooks/useToast.js';

const editSchema = yup.object({
  name: yup.string().trim().min(2).max(80).required('Name is required'),
  rollNo: yup.string().trim().min(1).max(20).required('Roll number is required'),
  mobile: yup.string().matches(/^[6-9]\d{9}$/, 'Must be a 10-digit number starting with 6-9').required('Mobile is required'),
  className: yup.string().default(''),
  active: yup.boolean().default(true),
  updatePastRecords: yup.boolean().default(false)
});

export function StudentForm({ isOpen, onClose, student, onSave, loading }) {
  const { toast } = useToast();
  const [timeSlot, setTimeSlot] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(editSchema),
    defaultValues: {
      name: '',
      rollNo: '',
      mobile: '',
      className: '',
      active: true,
      updatePastRecords: false
    }
  });

  const isActive = watch('active');
  const updatePast = watch('updatePastRecords');

  useEffect(() => {
    if (student) {
      reset({
        name: student.name || '',
        rollNo: student.rollNo || '',
        mobile: student.mobile || '',
        className: student.className || '',
        active: student.active ?? true,
        updatePastRecords: false
      });
      setTimeSlot(student.timeSlot || {
        enabled: false,
        loginTime: '10:00',
        logoutTime: '19:30',
        graceMinutes: 5,
        slotLabel: '10:00 AM - 07:30 PM Shift'
      });
    }
  }, [student, reset]);

  const onSubmit = async (data) => {
    try {
      await onSave({ ...data, timeSlot });
      onClose();
    } catch (err) {
      toast.error(err.message, 'Update Failed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Student Information"
      description="Update student biographical details, shifts/time slots, and activation status."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Roll Number"
          error={errors.rollNo?.message}
          {...register('rollNo')}
        />

        <Input
          label="Mobile Number (10 digits)"
          error={errors.mobile?.message}
          {...register('mobile')}
        />

        <Input
          label="Class / Batch"
          error={errors.className?.message}
          {...register('className')}
        />

        <div className="pt-2 border-t border-line">
          <TimeSlotConfig value={timeSlot} onChange={setTimeSlot} />
        </div>

        <div className="pt-2 border-t border-line space-y-3">
          <Switch
            label="Active Status"
            description="Inactive students cannot scan for attendance on the Kiosk"
            checked={isActive}
            onChange={(val) => setValue('active', val)}
          />

          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={updatePast}
              onChange={(e) => setValue('updatePastRecords', e.target.checked)}
              className="rounded text-primary focus:ring-primary w-4 h-4 border-line bg-surface"
            />
            <span>Also update student name & roll number on past attendance records</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
