import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ManualMarkDialog } from './ManualMarkDialog.jsx';
import { EditAttendanceDialog } from './EditAttendanceDialog.jsx';
import { api } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useToast } from '../../hooks/useToast.js';
import { formatTimeDisplay, formatLateDuration } from '../../lib/time.js';
import {
  FiPlus,
  FiUserCheck,
  FiDownload,
  FiSearch,
  FiList,
  FiGrid,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi';

export function AttendancePage() {
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'matrix'
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Dialogs
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  // Edit & Delete Attendance Record Dialogs
  const [editRecord, setEditRecord] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  // Set date ranges based on preset
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (datePreset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (datePreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (datePreset === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      setFromDate(w.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (datePreset === 'month') {
      const m = new Date(now);
      m.setDate(m.getDate() - 30);
      setFromDate(m.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  }, [datePreset]);

  // Fetch Attendance Records & Students
  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.set('from', fromDate);
      if (toDate) queryParams.set('to', toDate);
      if (sessionFilter) queryParams.set('session', sessionFilter);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (debouncedSearch) queryParams.set('q', debouncedSearch);

      const [attRes, stdRes] = await Promise.all([
        api.get(`/attendance/list?${queryParams.toString()}`, { authRequired: true }),
        api.get('/students?limit=200', { authRequired: true })
      ]);

      setRecords(attRes.records || []);
      setStudents(stdRes.students || []);
    } catch (err) {
      toast.error('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, sessionFilter, statusFilter, debouncedSearch]);

  const handleExportCSV = () => {
    const url = `/api/attendance/export?from=${fromDate}&to=${toDate}&session=${sessionFilter}`;
    window.open(url, '_blank');
  };

  const handleCloseSessionConfirm = async () => {
    setClosingSession(true);
    try {
      const res = await api.post('/attendance/manual', {
        action: 'close_session_absentees',
        dateKey: fromDate || new Date().toISOString().split('T')[0],
        session: sessionFilter || 'morning'
      }, { authRequired: true });

      toast.success(res.message || 'Session closed and absentees marked.');
      setCloseSessionOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to close session.');
    } finally {
      setClosingSession(false);
    }
  };

  const handleDeleteRecordConfirm = async () => {
    if (!deleteRecord) return;
    setDeletingRecord(true);
    try {
      await api.delete(`/attendance/${deleteRecord.id}`, { authRequired: true });
      toast.success('Attendance record removed.');
      setDeleteDialogOpen(false);
      setDeleteRecord(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete attendance record.');
    } finally {
      setDeletingRecord(false);
    }
  };

  // Matrix View Data Preparation: distinct dates across range
  const matrixDates = Array.from(new Set(records.map(r => r.dateKey))).sort().reverse().slice(0, 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Records"
        description="Monitor real-time biometric marks, evaluate session lateness, and perform administrative manual overrides."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCloseSessionOpen(true)}>
              Close Session & Mark Absentees
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FiDownload className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setManualDialogOpen(true)}>
              <FiPlus className="w-4 h-4 mr-1.5" />
              Add Manual Entry
            </Button>
          </>
        }
      />

      {/* Filters & View Switcher Bar */}
      <Card padding="p-4" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-token border border-line">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-token transition-colors ${
                  datePreset === p.id
                    ? 'bg-surface text-main shadow-sm'
                    : 'text-muted hover:text-main'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Segmented View Mode Control */}
          <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-token border border-line">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-token transition-colors ${
                viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-main'
              }`}
              title="List View"
            >
              <FiList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-token transition-colors ${
                viewMode === 'matrix' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-main'
              }`}
              title="Matrix View"
            >
              <FiGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            icon={FiSearch}
            placeholder="Search name or roll no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

            <Select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          >
            <option value="">All Sessions / Shifts</option>
            <option value="morning">Morning Session</option>
            <option value="afternoon">Afternoon Session</option>
            <option value="custom">Custom Shift Slots</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="present">Present (On Time)</option>
            <option value="late">Late Arrival</option>
            <option value="absent">Absent</option>
          </Select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setDatePreset('custom'); setFromDate(e.target.value); }}
              className="w-full px-2.5 py-2 text-xs bg-surface border border-line rounded-token text-main"
            />
            <span className="text-muted text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setDatePreset('custom'); setToDate(e.target.value); }}
              className="w-full px-2.5 py-2 text-xs bg-surface border border-line rounded-token text-main"
            />
          </div>
        </div>
      </Card>

      {/* Content Rendering: List vs Matrix */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-token" />
          <Skeleton className="h-16 w-full rounded-token" />
          <Skeleton className="h-16 w-full rounded-token" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={FiUserCheck}
          title="No attendance marks found"
          description="There are no attendance records for the selected filters."
        />
      ) : viewMode === 'list' ? (
        /* List Table View */
        <div className="overflow-hidden border border-line rounded-token bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session / Shift</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Lateness</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-center">Confidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-main font-poppins">{record.name}</span>
                        <span className="block text-[11px] text-muted font-mono">{record.rollNo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{record.dateKey}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className="font-medium">
                        {record.slotLabel || record.session}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          record.status === 'present'
                            ? 'success'
                            : record.status === 'late'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {record.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {record.lateMinutes > 0 ? (
                        <span className="text-warning font-semibold">
                          {formatLateDuration(record.lateMinutes, { prefix: true })}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-muted font-mono">
                      {formatTimeDisplay(record.markedAt)}
                    </td>
                    <td className="py-3 px-4 text-muted font-mono">
                      {record.logoutAt ? (
                        formatTimeDisplay(record.logoutAt)
                      ) : (
                        <span className="text-muted/50 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 uppercase text-muted">
                      {record.method || 'face'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-muted">
                      {record.confidence ? `${Math.round(record.confidence * 100)}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditRecord(record);
                            setEditDialogOpen(true);
                          }}
                          className="p-1.5 rounded-token border border-line text-muted hover:text-primary hover:border-primary/40 hover:bg-surface-2 transition-colors"
                          title="Edit Attendance Record"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteRecord(record);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-token border border-line text-muted hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-colors"
                          title="Delete Attendance Record"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Matrix Grid View */
        <Card className="overflow-x-auto p-4">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="text-left py-2 px-3 font-semibold">Student</th>
                {matrixDates.map(d => (
                  <th key={d} colSpan={2} className="py-2 px-2 border-l border-line font-mono font-bold">
                    {d.slice(5)}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-line text-[10px] text-muted uppercase">
                <th />
                {matrixDates.map(d => (
                  <React.Fragment key={d}>
                    <th className="py-1 px-1 border-l border-line">M</th>
                    <th className="py-1 px-1">A</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-surface-2/40">
                  <td className="py-2.5 px-3 text-left font-medium text-main">
                    <span className="font-semibold">{s.name}</span>
                    <span className="block text-[10px] text-muted font-mono">{s.rollNo}</span>
                  </td>
                  {matrixDates.map(d => {
                    const morningRec = records.find(r => r.studentId === s.id && r.dateKey === d && r.session === 'morning');
                    const afternoonRec = records.find(r => r.studentId === s.id && r.dateKey === d && r.session === 'afternoon');

                    const renderCell = (rec) => {
                      if (!rec) return <span className="text-muted/40 font-mono">-</span>;
                      if (rec.status === 'present') return <span className="font-bold text-success">P</span>;
                      if (rec.status === 'late') return <span className="font-bold text-warning">L</span>;
                      return <span className="font-bold text-danger">A</span>;
                    };

                    return (
                      <React.Fragment key={d}>
                        <td className="py-2 px-1 border-l border-line bg-surface-2/20">
                          {renderCell(morningRec)}
                        </td>
                        <td className="py-2 px-1 bg-surface-2/20">
                          {renderCell(afternoonRec)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Manual Mark Dialog */}
      <ManualMarkDialog
        isOpen={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        onMarkSaved={loadData}
        students={students}
      />

      {/* Close Session and Mark Absentees Confirm Dialog */}
      <ConfirmDialog
        isOpen={closeSessionOpen}
        onClose={() => setCloseSessionOpen(false)}
        onConfirm={handleCloseSessionConfirm}
        loading={closingSession}
        title="Close Session & Mark Absentees?"
        message="This action will find all enrolled active students without a recorded scan for this session, and record them as 'Absent'."
        confirmText="Confirm & Mark Absentees"
        danger={false}
      />

      {/* Edit Attendance Record Dialog */}
      <EditAttendanceDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditRecord(null);
        }}
        record={editRecord}
        onSaveSuccess={loadData}
      />

      {/* Delete Attendance Record Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteRecord(null);
        }}
        onConfirm={handleDeleteRecordConfirm}
        loading={deletingRecord}
        title="Delete Attendance Record?"
        message={`Are you sure you want to permanently delete the attendance record for ${deleteRecord?.name || 'this student'} on ${deleteRecord?.dateKey || ''}?`}
        confirmText="Delete Record"
        danger={true}
      />
    </div>
  );
}
