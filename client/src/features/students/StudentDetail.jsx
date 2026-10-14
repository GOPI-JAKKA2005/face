import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { StudentForm } from './StudentForm.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDateDisplay, formatTimeDisplay, formatLateDuration, formatMinutesTo12Hour } from '../../lib/time.js';
import {
  FiArrowLeft,
  FiPhone,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiShield
} from 'react-icons/fi';

export function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit & Delete modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const studentRes = await api.get(`/students/${id}`, { authRequired: true });
        setStudent(studentRes.student);

        // Fetch attendance history for this student
        const attRes = await api.get(`/attendance/list?studentId=${id}&limit=90`, { authRequired: true });
        setAttendance(attRes.records || []);
      } catch (err) {
        console.error('Failed to load student detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-token" />
        <Skeleton className="h-64 w-full rounded-token" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center p-12">
        <h3 className="text-lg font-bold text-main">Student Not Found</h3>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/admin/students')}>
          Return to Students
        </Button>
      </div>
    );
  }

  // Calculate statistics
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
  const avgLateMinutes = lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0;

  // Build 90-day calendar heatmap data
  const calendarDays = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const match = attendance.find(a => a.dateKey === dateKey);
    calendarDays.push({
      dateKey,
      status: match ? match.status : 'none'
    });
  }

  const handleSaveEdit = async (data) => {
    try {
      const res = await api.put(`/students/${id}`, data, { authRequired: true });
      setStudent(res.student);
      toast.success('Student details updated.');
      setEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update student.');
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${id}`, { authRequired: true });
      toast.success('Student removed from system.');
      navigate('/admin/students', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/students')}>
          <FiArrowLeft className="w-4 h-4 mr-1" />
          Back to Students
        </Button>
      </div>

      <PageHeader
        title={student.name}
        description={`Roll Number: ${student.rollNo} • Batch: ${student.className || 'General'}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={student.active ? 'success' : 'default'}>
              {student.active ? 'Active Enrolled' : 'Inactive'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
            >
              <FiEdit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit Student
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
            >
              <FiTrash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        }
      />

      {/* Profile Overview Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-token border border-line bg-surface-2 flex items-center justify-center font-bold text-2xl text-primary overflow-hidden flex-shrink-0">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              student.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h3 className="text-xl font-bold text-main font-poppins">{student.name}</h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted">
              <span className="font-mono">Roll: {student.rollNo}</span>
              <a
                href={`tel:${student.mobile}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <FiPhone className="w-3.5 h-3.5" />
                <span>+91 {student.mobile}</span>
              </a>
              <span>Samples: {student.signatureCount || 0}</span>
              <span>Enrolled: {formatDateDisplay(student.enrolledAt)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Assigned Schedule / Time Slot Card */}
      <Card className="border border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-token bg-primary/10 text-primary">
              <FiClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-main">Assigned Work / Study Schedule</h4>
                {student.timeSlot?.enabled ? (
                  <Badge variant="primary">Individual Slot Active</Badge>
                ) : (
                  <Badge variant="default">Institutional Default</Badge>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {student.timeSlot?.enabled
                  ? `Designated shift: ${student.timeSlot.slotLabel || 'Custom Schedule'}. Lateness is calculated against this shift.`
                  : 'Follows institutional morning/afternoon session schedules set in System Settings.'}
              </p>
            </div>
          </div>

          {student.timeSlot?.enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-surface-2 p-3 rounded-token border border-line text-center text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">Morning</span>
                <span className="font-semibold text-main font-mono">{formatMinutesTo12Hour(student.timeSlot.loginTime || '10:00')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">Post-Lunch</span>
                <span className="font-semibold text-primary font-mono">{formatMinutesTo12Hour(student.timeSlot.afternoonLoginTime || '14:00')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">Logout By</span>
                <span className="font-semibold text-main font-mono">{formatMinutesTo12Hour(student.timeSlot.logoutTime || '19:30')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">Grace</span>
                <span className="font-semibold text-warning font-mono">+{student.timeSlot.graceMinutes ?? 5}m</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Totals & Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <FiCheckCircle className="w-5 h-5 text-success mx-auto mb-1.5" />
          <p className="text-xs text-muted">Present (On Time)</p>
          <p className="text-2xl font-bold text-main mt-0.5">{presentCount}</p>
        </Card>
        <Card className="text-center p-4">
          <FiClock className="w-5 h-5 text-warning mx-auto mb-1.5" />
          <p className="text-xs text-muted">Late Arrivals</p>
          <p className="text-2xl font-bold text-warning mt-0.5">{lateCount}</p>
        </Card>
        <Card className="text-center p-4">
          <FiXCircle className="w-5 h-5 text-danger mx-auto mb-1.5" />
          <p className="text-xs text-muted">Absences</p>
          <p className="text-2xl font-bold text-danger mt-0.5">{absentCount}</p>
        </Card>
        <Card className="text-center p-4">
          <FiCalendar className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-xs text-muted">Avg Late Time</p>
          <p className="text-2xl font-bold text-main mt-0.5">{avgLateMinutes > 0 ? formatLateDuration(avgLateMinutes) : '0 min'}</p>
        </Card>
      </div>

      {/* 90-Day Attendance Heatmap Calendar */}
      <Card>
        <h4 className="text-sm font-semibold text-main mb-1">90-Day Attendance Heatmap</h4>
        <p className="text-xs text-muted mb-4">Historical visual log of daily attendance marks.</p>

        <div className="flex flex-wrap gap-1.5 justify-start">
          {calendarDays.map((day) => {
            const colorClass =
              day.status === 'present'
                ? 'bg-success'
                : day.status === 'late'
                ? 'bg-warning'
                : day.status === 'absent'
                ? 'bg-danger'
                : 'bg-surface-2';
            return (
              <div
                key={day.dateKey}
                title={`${day.dateKey}: ${day.status}`}
                className={`w-3.5 h-3.5 rounded-sm ${colorClass} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted mt-4 pt-3 border-t border-line">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-success" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-warning" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-danger" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-surface-2" />
            <span>No Record</span>
          </div>
        </div>
      </Card>

      {/* Recent Attendance Records */}
      <Card>
        <h4 className="text-sm font-semibold text-main mb-3">Recent Scans & Logs</h4>
        {attendance.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">No attendance records found for this student.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-muted uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Session / Shift</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Late Time</th>
                  <th className="py-2.5 px-3">Check-In</th>
                  <th className="py-2.5 px-3">Check-Out</th>
                  <th className="py-2.5 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {attendance.slice(0, 15).map(record => (
                  <tr key={record.id || `${record.dateKey}_${record.session}`}>
                    <td className="py-2.5 px-3 font-mono">{record.dateKey}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-main capitalize">
                        {record.slotLabel || record.session}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-warning font-semibold">
                      {record.lateMinutes > 0 ? formatLateDuration(record.lateMinutes, { prefix: true }) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-muted font-mono">{formatTimeDisplay(record.markedAt)}</td>
                    <td className="py-2.5 px-3 text-muted font-mono">
                      {record.logoutAt ? formatTimeDisplay(record.logoutAt) : (
                        <span className="text-muted/60 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-muted">{record.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Student Modal */}
      <StudentForm
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        student={student}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="Delete Student Record?"
        message={`Are you sure you want to permanently delete ${student.name} (${student.rollNo}) and their biometric facial signatures?`}
        confirmText="Delete Student"
      />
    </div>
  );
}
