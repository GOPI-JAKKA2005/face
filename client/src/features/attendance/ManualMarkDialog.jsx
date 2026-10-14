import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { manualMarkSchema } from '../../lib/validate.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';

export function ManualMarkDialog({ isOpen, onClose, onMarkSaved, students = [] }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(manualMarkSchema),
    defaultValues: {
      studentId: '',
      dateKey: todayStr,
      session: 'morning',
      status: 'present',
      reason: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        studentId: students[0]?.id || '',
        dateKey: todayStr,
        session: 'morning',
        status: 'present',
        reason: ''
      });
    }
  }, [isOpen, students, reset, todayStr]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await api.post('/attendance/manual', data, { authRequired: true });
      toast.success('Manual attendance entry saved.');
      onMarkSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save manual mark.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Attendance Entry / Override"
      description="Record or overwrite attendance manually. Action is stamped with your admin ID and logged in the audit trail."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Select Student */}
        <Select
          label="Select Student"
          error={errors.studentId?.message}
          {...register('studentId')}
        >
          <option value="">-- Choose student --</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.rollNo})
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            max={todayStr}
            error={errors.dateKey?.message}
            {...register('dateKey')}
          />

          <Select
            label="Session"
            error={errors.session?.message}
            {...register('session')}
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </Select>
        </div>

        <Select
          label="Attendance Status"
          error={errors.status?.message}
          {...register('status')}
        >
          <option value="present">Present (On Time)</option>
          <option value="late">Late Arrival</option>
          <option value="absent">Absent</option>
        </Select>

        <Input
          label="Reason for Manual Entry (Required)"
          placeholder="e.g. Approved medical leave / Scanner network retry"
          error={errors.reason?.message}
          {...register('reason')}
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Submit Attendance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
