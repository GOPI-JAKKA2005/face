import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EditAttendanceDialog } from '../attendance/EditAttendanceDialog.jsx';
import { api } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';
import { formatTimeDisplay, formatDateDisplay, formatLateDuration } from '../../lib/time.js';
import { generateDailyReportPdf, generateMonthlyReportPdf } from '../../lib/pdfReport.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  FiDownload,
  FiPrinter,
  FiAward,
  FiCalendar,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

export function ReportsPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'monthly'
  const [loading, setLoading] = useState(true);

  // Raw data from backend
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Daily Report States
  const [dailyDate, setDailyDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dailyStatusFilter, setDailyStatusFilter] = useState(''); // '' | 'present' | 'late' | 'absent'

  // Monthly Report States
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Edit / Delete Attendance Record Modals
  const [editRecord, setEditRecord] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load Data
  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const [stdRes, attRes] = await Promise.all([
          api.get('/students?limit=200', { authRequired: true }),
          api.get(`/attendance/list?from=${dailyDate}&to=${dailyDate}&limit=500`, { authRequired: true })
        ]);
        setStudents(stdRes.students || []);
        setRecords(attRes.records || []);
      } else {
        // Monthly date boundaries
        const y = selectedYear;
        const m = String(selectedMonth).padStart(2, '0');
        const startDay = `${y}-${m}-01`;
        const lastDate = new Date(y, selectedMonth, 0).getDate();
        const endDay = `${y}-${m}-${String(lastDate).padStart(2, '0')}`;

        const [stdRes, attRes] = await Promise.all([
          api.get('/students?limit=200', { authRequired: true }),
          api.get(`/attendance/list?from=${startDay}&to=${endDay}&limit=2000`, { authRequired: true })
        ]);
        setStudents(stdRes.students || []);
        setRecords(attRes.records || []);
      }
    } catch (err) {
      console.error('Reports load error:', err);
      toast.error('Failed to load attendance report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, dailyDate, selectedYear, selectedMonth]);

  // Quick Date Helpers for Daily Report
  const setQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setDailyDate(d.toISOString().split('T')[0]);
  };

  // Distinct Classes
  const distinctClasses = useMemo(() => {
    const set = new Set();
    students.forEach(s => { if (s.className) set.add(s.className); });
    return Array.from(set).sort();
  }, [students]);

  // -------------------------------------------------------------
  // DAILY REPORT DATA PROCESSING
  // -------------------------------------------------------------
  const dailyRoster = useMemo(() => {
    let list = students.map(s => {
      // Find record for this student on selected date
      const rec = records.find(r => r.studentId === s.id);
      return {
        id: s.id,
        name: s.name,
        rollNo: s.rollNo,
        className: s.className || 'General',
        recordId: rec ? rec.id : null,
        status: rec ? rec.status : 'absent',
        markedAt: rec ? rec.markedAt : null,
        logoutAt: rec ? rec.logoutAt : null,
        slotLabel: rec?.slotLabel || (s.timeSlot?.enabled ? s.timeSlot.slotLabel : null),
        lateMinutes: rec ? (rec.lateMinutes || 0) : 0,
        session: rec ? rec.session : null,
        method: rec ? rec.method : null,
        reason: rec ? rec.reason : null,
        isRecorded: Boolean(rec)
      };
    });

    // Apply Filters
    if (classFilter) {
      list = list.filter(s => s.className === classFilter);
    }
    if (dailyStatusFilter) {
      list = list.filter(s => s.status === dailyStatusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, records, classFilter, dailyStatusFilter, searchTerm]);

  // Daily Summary Counters
  const dailySummary = useMemo(() => {
    const total = dailyRoster.length;
    const present = dailyRoster.filter(r => r.status === 'present').length;
    const late = dailyRoster.filter(r => r.status === 'late').length;
    const absent = dailyRoster.filter(r => r.status === 'absent').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  }, [dailyRoster]);

  // -------------------------------------------------------------
  // MONTHLY REPORT DATA PROCESSING
  // -------------------------------------------------------------
  const monthlyDaysCount = new Date(selectedYear, selectedMonth, 0).getDate();

  const studentStats = useMemo(() => {
    let list = students.map(s => {
      const sRecords = records.filter(r => r.studentId === s.id);
      const presentCount = sRecords.filter(r => r.status === 'present').length;
      const lateCount = sRecords.filter(r => r.status === 'late').length;
      const absentCount = sRecords.filter(r => r.status === 'absent').length;
      const totalMarked = presentCount + lateCount;
      const totalLateMinutes = sRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);

      // Unique days with check-ins in this month
      const attendedDays = new Set(sRecords.filter(r => r.status === 'present' || r.status === 'late').map(r => r.dateKey)).size;
      const rate = monthlyDaysCount > 0 ? Math.round((attendedDays / monthlyDaysCount) * 100) : 0;

      return {
        id: s.id,
        name: s.name,
        rollNo: s.rollNo,
        className: s.className || 'General',
        presentCount,
        lateCount,
        absentCount,
        totalMarked,
        totalLateMinutes,
        rate,
        records: sRecords
      };
    });

    if (classFilter) {
      list = list.filter(s => s.className === classFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, records, classFilter, searchTerm, monthlyDaysCount]);

  const monthlySummary = useMemo(() => {
    const totalStudents = studentStats.length;
    const totalCheckIns = records.length;
    const totalLate = records.filter(r => r.status === 'late').length;
    const avgRate = totalStudents > 0
      ? Math.round(studentStats.reduce((sum, s) => sum + s.rate, 0) / totalStudents)
      : 0;
    return { totalStudents, totalCheckIns, totalLate, avgRate };
  }, [studentStats, records]);

  // Podium Ranking
  const punctualityRanking = useMemo(() => {
    return [...studentStats].sort((a, b) => b.rate - a.rate || a.totalLateMinutes - b.totalLateMinutes);
  }, [studentStats]);

  // Session Charts
  const morningCount = records.filter(r => r.session === 'morning').length;
  const afternoonCount = records.filter(r => r.session === 'afternoon').length;
  const sessionChartData = [
    { name: 'Morning Session', value: morningCount || 1, color: '#4F46E5' },
    { name: 'Afternoon Session', value: afternoonCount || 1, color: '#14B8A6' }
  ];

  // Lateness distribution bins
  const lateBins = [
    { range: '1-5 min', count: records.filter(r => r.lateMinutes > 0 && r.lateMinutes <= 5).length },
    { range: '6-15 min', count: records.filter(r => r.lateMinutes > 5 && r.lateMinutes <= 15).length },
    { range: '16-30 min', count: records.filter(r => r.lateMinutes > 15 && r.lateMinutes <= 30).length },
    { range: '30+ min', count: records.filter(r => r.lateMinutes > 30).length }
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const selectedMonthName = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // -------------------------------------------------------------
  // ACTIONS & EXPORTS
  // -------------------------------------------------------------
  const handleDownloadPdf = () => {
    if (activeTab === 'daily') {
      generateDailyReportPdf({
        dateKey: dailyDate,
        studentRoster: dailyRoster,
        summary: dailySummary
      });
      toast.success(`Daily attendance PDF generated for ${dailyDate}.`);
    } else {
      generateMonthlyReportPdf({
        monthYear: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
        monthName: selectedMonthName,
        studentStats: studentStats,
        summary: monthlySummary
      });
      toast.success(`Monthly attendance PDF generated for ${selectedMonthName}.`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeTab === 'daily') {
      let csv = '\uFEFF# ,Roll No,Name,Class,Status,Session / Shift,Check-In,Check-Out,Late Duration\n';
      dailyRoster.forEach((r, idx) => {
        const lateStr = r.lateMinutes > 0 ? formatLateDuration(r.lateMinutes, { prefix: true }) : '-';
        const sessionOrShift = r.slotLabel || r.session || '-';
        const checkIn = r.markedAt ? formatTimeDisplay(r.markedAt) : '-';
        const checkOut = r.logoutAt ? formatTimeDisplay(r.logoutAt) : '-';
        csv += `${idx + 1},"${r.rollNo}","${r.name}","${r.className}","${r.status}","${sessionOrShift}","${checkIn}","${checkOut}","${lateStr}"\n`;
      });
      downloadBlob(csv, `Daily-Attendance-Report-${dailyDate}.csv`);
    } else {
      let csv = '\uFEFF# ,Roll No,Name,Class,Present Days,Late Days,Absent Days,Total Late,Monthly Attendance %\n';
      studentStats.forEach((s, idx) => {
        csv += `${idx + 1},"${s.rollNo}","${s.name}","${s.className}",${s.presentCount},${s.lateCount},${s.absentCount},"${formatLateDuration(s.totalLateMinutes)}",${s.rate}%\n`;
      });
      downloadBlob(csv, `Monthly-Attendance-Report-${selectedYear}-${selectedMonth}.csv`);
    }
  };

  const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Delete Attendance Record
  const handleDeleteRecordConfirm = async () => {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      await api.delete(`/attendance/${deleteRecord.id}`, { authRequired: true });
      toast.success('Attendance record deleted.');
      setDeleteDialogOpen(false);
      setDeleteRecord(null);
      loadReportData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Tab Switcher */}
      <PageHeader
        title="Attendance Reports & Historical Logs"
        description="Comprehensive daily rosters, retrospective date verification, monthly aggregations, and official printable PDF documents."
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <FiPrinter className="w-4 h-4 mr-1.5" />
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <FiFileText className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={handleDownloadPdf}>
              <FiDownload className="w-4 h-4 mr-1.5" />
              Download {activeTab === 'daily' ? 'Daily' : 'Monthly'} PDF
            </Button>
          </div>
        }
      />

      {/* Report Mode Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-2 rounded-token border border-line w-full sm:w-auto sm:inline-flex no-print">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-token transition-all flex items-center justify-center gap-2 ${
            activeTab === 'daily'
              ? 'bg-primary text-primary-contrast shadow-sm'
              : 'text-muted hover:text-main'
          }`}
        >
          <FiCalendar className="w-4 h-4" />
          <span>Daily Attendance Report</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-token transition-all flex items-center justify-center gap-2 ${
            activeTab === 'monthly'
              ? 'bg-primary text-primary-contrast shadow-sm'
              : 'text-muted hover:text-main'
          }`}
        >
          <FiFileText className="w-4 h-4" />
          <span>Monthly Summary Report</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY ATTENDANCE REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Daily Filter Controls Card */}
          <Card padding="p-4" className="space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Quick Retrospective Presets */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-2 rounded-token border border-line">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-token transition-colors ${
                    dailyDate === new Date().toISOString().split('T')[0]
                      ? 'bg-surface text-primary shadow-sm font-bold'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-token text-muted hover:text-main"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(2)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-token bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-bold"
                  title="Check attendance from 2 days ago"
                >
                  2 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-token text-muted hover:text-main"
                >
                  1 Week Ago
                </button>
              </div>

              {/* Exact Date Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">Selected Date:</span>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono bg-surface border border-line rounded-token text-main font-semibold"
                />
              </div>
            </div>

            {/* Row 2: Search, Class, Status filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-line">
              <Input
                icon={FiSearch}
                placeholder="Search student name or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                {distinctClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>

              <Select
                value={dailyStatusFilter}
                onChange={(e) => setDailyStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="present">Present (On Time)</option>
                <option value="late">Late Arrival</option>
                <option value="absent">Absent / Unmarked</option>
              </Select>
            </div>
          </Card>

          {/* Daily KPI Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <span className="text-xs text-muted block mb-1">Total Enrolled</span>
              <span className="text-2xl font-bold text-main font-poppins">{dailySummary.total}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-success">
              <span className="text-xs text-success font-semibold block mb-1">Present (On Time)</span>
              <span className="text-2xl font-bold text-success font-poppins">{dailySummary.present}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-warning">
              <span className="text-xs text-warning font-semibold block mb-1">Late Arrivals</span>
              <span className="text-2xl font-bold text-warning font-poppins">{dailySummary.late}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-danger">
              <span className="text-xs text-danger font-semibold block mb-1">Absent / Not Marked</span>
              <span className="text-2xl font-bold text-danger font-poppins">{dailySummary.absent}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-primary">
              <span className="text-xs text-primary font-semibold block mb-1">Attendance Rate</span>
              <span className="text-2xl font-bold text-primary font-poppins">{dailySummary.rate}%</span>
            </Card>
          </div>

          {/* Daily Student Roster Table */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-token" />
              <Skeleton className="h-16 w-full rounded-token" />
              <Skeleton className="h-16 w-full rounded-token" />
            </div>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm text-main font-poppins">
                    Daily Attendance Roster — {formatDateDisplay(dailyDate)} ({dailyDate})
                  </h4>
                  <p className="text-xs text-muted mt-0.5">
                    Showing attendance verification status for all {dailyRoster.length} students on this day.
                  </p>
                </div>
                <Badge variant={dailySummary.rate >= 75 ? 'success' : 'warning'}>
                  {dailySummary.rate}% Attendance
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2/60 border-b border-line text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10">#</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Session / Shift</th>
                      <th className="py-3 px-4">Check-In</th>
                      <th className="py-3 px-4">Check-Out</th>
                      <th className="py-3 px-4">Lateness</th>
                      <th className="py-3 px-4 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dailyRoster.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-muted">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-main font-poppins">{student.name}</td>
                        <td className="py-3 px-4 font-mono">{student.rollNo}</td>
                        <td className="py-3 px-4 text-muted">{student.className}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              student.status === 'present'
                                ? 'success'
                                : student.status === 'late'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {student.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          {student.slotLabel || student.session || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted">
                          {student.markedAt ? formatTimeDisplay(student.markedAt) : '--:--'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted">
                          {student.logoutAt ? formatTimeDisplay(student.logoutAt) : (student.isRecorded ? '-' : '--:--')}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {student.lateMinutes > 0 ? (
                            <span className="text-warning font-semibold">
                              {formatLateDuration(student.lateMinutes, { prefix: true })}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            {student.isRecorded ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditRecord({
                                      id: student.recordId,
                                      studentId: student.id,
                                      name: student.name,
                                      rollNo: student.rollNo,
                                      dateKey: dailyDate,
                                      status: student.status,
                                      lateMinutes: student.lateMinutes,
                                      session: student.session || 'morning',
                                      reason: student.reason || '',
                                      isNew: false,
                                      isRecorded: true
                                    });
                                    setEditDialogOpen(true);
                                  }}
                                  className="p-1.5 rounded-token border border-line text-muted hover:text-primary hover:border-primary/40 hover:bg-surface-2 transition-colors"
                                  title="Edit Attendance Mark"
                                >
                                  <FiEdit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteRecord({
                                      id: student.recordId,
                                      name: student.name,
                                      dateKey: dailyDate
                                    });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="p-1.5 rounded-token border border-line text-muted hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-colors"
                                  title="Delete Record"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  // Quick mark / manual override for unmarked student
                                  setEditRecord({
                                    id: `${dailyDate}_morning_${student.id}`,
                                    studentId: student.id,
                                    name: student.name,
                                    rollNo: student.rollNo,
                                    dateKey: dailyDate,
                                    status: 'present',
                                    lateMinutes: 0,
                                    session: 'morning',
                                    reason: 'Admin retroactive mark',
                                    isNew: true,
                                    isRecorded: false
                                  });
                                  setEditDialogOpen(true);
                                }}
                                className="px-2 py-1 rounded-token border border-line text-[11px] text-primary hover:bg-primary/10 transition-colors font-semibold"
                                title="Add Attendance Record for this Date"
                              >
                                Mark Present
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY SUMMARY REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Filter Bar */}
          <Card padding="p-4" className="space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">Select Month & Year:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs bg-surface border border-line rounded-token text-main font-semibold"
                >
                  {monthNames.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs bg-surface border border-line rounded-token text-main font-semibold"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const curr = new Date();
                  setSelectedYear(curr.getFullYear());
                  setSelectedMonth(curr.getMonth() + 1);
                }}
              >
                Current Month
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-line">
              <Input
                icon={FiSearch}
                placeholder="Search student in monthly roster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                {distinctClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Monthly KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <span className="text-xs text-muted block mb-1">Enrolled Students</span>
              <span className="text-2xl font-bold text-main font-poppins">{monthlySummary.totalStudents}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-primary">
              <span className="text-xs text-primary font-semibold block mb-1">Total Scans Recorded</span>
              <span className="text-2xl font-bold text-primary font-poppins">{monthlySummary.totalCheckIns}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-warning">
              <span className="text-xs text-warning font-semibold block mb-1">Late Arrivals</span>
              <span className="text-2xl font-bold text-warning font-poppins">{monthlySummary.totalLate}</span>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-success">
              <span className="text-xs text-success font-semibold block mb-1">Avg Attendance Rate</span>
              <span className="text-2xl font-bold text-success font-poppins">{monthlySummary.avgRate}%</span>
            </Card>
          </div>

          {/* Top 3 Punctual Students Podium */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FiAward className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-base text-main font-poppins">Monthly Punctuality Leaderboard</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {punctualityRanking.slice(0, 3).map((st, idx) => (
                <div
                  key={st.id}
                  className={`p-4 rounded-token border relative text-center ${
                    idx === 0
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-surface-2/40 border-line'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-contrast font-bold text-xs flex items-center justify-center mx-auto mb-2 font-mono">
                    #{idx + 1}
                  </div>
                  <h4 className="font-bold text-sm text-main truncate font-poppins">{st.name}</h4>
                  <p className="text-xs text-muted font-mono">Roll: {st.rollNo}</p>
                  <div className="mt-2 text-xs font-semibold text-success">
                    {st.rate}% Attendance Rate
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Two Column Charts: Lateness Distribution & Session Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h4 className="font-semibold text-sm text-main font-poppins mb-1">Lateness Minutes Distribution</h4>
              <p className="text-xs text-muted mb-4">Distribution of late arrivals during {selectedMonthName}</p>

              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lateBins}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border))" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'rgb(var(--text-muted))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--text-muted))' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="rgb(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-main font-poppins mb-1">Session Activity Ratio</h4>
                <p className="text-xs text-muted mb-4">Morning vs Afternoon scans during {selectedMonthName}</p>
              </div>

              <div className="w-full h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sessionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <span>Morning ({morningCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-accent" />
                  <span>Afternoon ({afternoonCount})</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Monthly Student Roster with Day-by-Day Expandable Inspector */}
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-main font-poppins">
                  Monthly Performance Roster — {selectedMonthName}
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  Aggregated statistics per registered student. Click on any student row to inspect daily attendance.
                </p>
              </div>
              <span className="text-xs text-muted font-mono">{studentStats.length} Students</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/60 border-b border-line text-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-8" />
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Late</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Late Mins</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {studentStats.map(s => {
                    const isExpanded = expandedStudentId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                          className={`hover:bg-surface-2/40 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-muted">
                            {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                          </td>
                          <td className="py-3 px-4 font-semibold text-main font-poppins">{s.name}</td>
                          <td className="py-3 px-4 font-mono">{s.rollNo}</td>
                          <td className="py-3 px-4 text-muted">{s.className}</td>
                          <td className="py-3 px-4 text-center font-bold text-success">{s.presentCount}</td>
                          <td className="py-3 px-4 text-center font-bold text-warning">{s.lateCount}</td>
                          <td className="py-3 px-4 text-center font-bold text-danger">{s.absentCount}</td>
                          <td className="py-3 px-4 text-center font-mono text-muted">{formatLateDuration(s.totalLateMinutes)}</td>
                          <td className="py-3 px-4 text-right font-bold text-main font-mono">
                            <span className={s.rate >= 75 ? 'text-success' : 'text-danger'}>
                              {s.rate}%
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Day-by-Day Inspection Grid for this Student */}
                        {isExpanded && (
                          <tr className="bg-surface-2/30">
                            <td colSpan={9} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-semibold text-main">
                                  <span>Daily Breakdown for {s.name} in {selectedMonthName}</span>
                                  <div className="flex items-center gap-3 text-[11px] text-muted">
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> Present</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" /> Late</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Absent</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
                                  {Array.from({ length: monthlyDaysCount }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dayKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                    const match = s.records.find(r => r.dateKey === dayKey);

                                    let badgeColor = 'bg-surface border-line text-muted';
                                    let label = 'A';
                                    if (match?.status === 'present') {
                                      badgeColor = 'bg-success/15 border-success text-success font-bold';
                                      label = 'P';
                                    } else if (match?.status === 'late') {
                                      badgeColor = 'bg-warning/15 border-warning text-warning font-bold';
                                      label = 'L';
                                    }

                                    return (
                                      <div
                                        key={dayKey}
                                        className={`p-1.5 rounded border text-center text-[10px] ${badgeColor}`}
                                        title={`${dayKey}: ${match ? match.status : 'Absent'}`}
                                      >
                                        <span className="block font-mono text-[9px] text-muted">{dayNum}</span>
                                        <span className="block font-bold mt-0.5">{label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Attendance Record Dialog */}
      <EditAttendanceDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditRecord(null);
        }}
        record={editRecord}
        onSaveSuccess={loadReportData}
      />

      {/* Delete Record Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteRecord(null);
        }}
        onConfirm={handleDeleteRecordConfirm}
        loading={deleting}
        title="Delete Attendance Record?"
        message={`Are you sure you want to permanently delete the attendance record for ${deleteRecord?.name || 'this student'} on ${deleteRecord?.dateKey || ''}?`}
        confirmText="Delete Record"
        danger={true}
      />
    </div>
  );
}
