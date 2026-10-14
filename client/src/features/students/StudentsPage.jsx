import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { StudentForm } from './StudentForm.jsx';
import { api } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useToast } from '../../hooks/useToast.js';
import { formatMinutesTo12Hour } from '../../lib/time.js';
import {
  FiSearch,
  FiUserPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiUsers,
  FiPhone,
  FiClock
} from 'react-icons/fi';

export function StudentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Edit modal
  const [editStudent, setEditStudent] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const url = debouncedSearch
        ? `/students?q=${encodeURIComponent(debouncedSearch)}`
        : '/students';
      const res = await api.get(url, { authRequired: true });
      setStudents(res.students || []);
    } catch (err) {
      toast.error('Failed to load students directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [debouncedSearch]);

  const handleToggleActive = async (student) => {
    const nextActive = !student.active;
    try {
      // Optimistic update
      setStudents(prev =>
        prev.map(s => (s.id === student.id ? { ...s, active: nextActive } : s))
      );
      await api.put(`/students/${student.id}`, { active: nextActive }, { authRequired: true });
      toast.info(
        `${student.name} marked as ${nextActive ? 'active' : 'inactive'}.`,
        'Status Changed',
        () => handleToggleActive(student) // Undo support
      );
    } catch (err) {
      // Rollback
      setStudents(prev =>
        prev.map(s => (s.id === student.id ? { ...s, active: student.active } : s))
      );
      toast.error('Failed to update student status.');
    }
  };

  const handleSaveEdit = async (data) => {
    if (!editStudent) return;
    const res = await api.put(`/students/${editStudent.id}`, data, { authRequired: true });
    setStudents(prev =>
      prev.map(s => (s.id === editStudent.id ? res.student : s))
    );
    toast.success('Student details updated.');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/students/${deleteId}`, { authRequired: true });
      setStudents(prev => prev.filter(s => s.id !== deleteId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
      toast.success('Student removed from system.');
    } catch (err) {
      toast.error('Failed to delete student.');
    } finally {
      setDeleteModalOpen(false);
      setDeleteId(null);
    }
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await api.put(`/students/${id}`, { active: false }, { authRequired: true });
      }
      setStudents(prev =>
        prev.map(s => (selectedIds.has(s.id) ? { ...s, active: false } : s))
      );
      toast.success(`Deactivated ${selectedIds.size} students.`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Bulk deactivation error.');
    }
  };

  const handleBulkExport = () => {
    const rows = students.filter(s => selectedIds.has(s.id));
    if (rows.length === 0) return;

    let csvContent = '\uFEFFRoll No,Name,Mobile,Class,Active,Samples\n';
    rows.forEach(r => {
      csvContent += `"${r.rollNo}","${r.name}","${r.mobile}","${r.className || ''}","${r.active ? 'Yes' : 'No'}","${r.signatureCount || 0}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students-export-${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students Directory"
        description="Manage enrolled students, biometric signatures, active scanning permissions, and student profiles."
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/enroll')}>
            <FiUserPlus className="w-4 h-4 mr-2" />
            Enroll New Student
          </Button>
        }
      />

      {/* Search & Bulk Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:max-w-xs">
          <Input
            icon={FiSearch}
            placeholder="Search by name, roll no, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-1.5 bg-surface-2 border border-line rounded-token">
            <span className="text-xs font-semibold text-main px-2">
              {selectedIds.size} selected
            </span>
            <Button size="sm" variant="secondary" onClick={handleBulkDeactivate}>
              Deactivate
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <FiDownload className="w-3.5 h-3.5 mr-1" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Directory Table / Mobile Card List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-token" />
          <Skeleton className="h-16 w-full rounded-token" />
          <Skeleton className="h-16 w-full rounded-token" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title="No students found"
          description={search ? 'No student matches your search query.' : 'No students have been enrolled yet.'}
          action={
            <Button variant="primary" onClick={() => navigate('/admin/enroll')}>
              Enroll First Student
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table (hidden below 640px) */}
          <div className="hidden sm:block overflow-hidden border border-line rounded-token bg-surface shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-muted uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === students.length && students.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-primary focus:ring-primary w-4 h-4 border-line bg-surface"
                    />
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Shift / Schedule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Samples</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-surface-2/40 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(student.id)}
                          className="rounded text-primary focus:ring-primary w-4 h-4 border-line bg-surface"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary overflow-hidden flex-shrink-0">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              student.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                              className="font-semibold text-main hover:text-primary transition-colors text-left font-poppins"
                            >
                              {student.name}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{student.rollNo}</td>
                      <td className="py-3 px-4">
                        <a
                          href={`tel:${student.mobile}`}
                          className="text-muted hover:text-primary transition-colors inline-flex items-center gap-1 font-mono"
                        >
                          <FiPhone className="w-3 h-3" />
                          <span>{student.mobile}</span>
                        </a>
                      </td>
                      <td className="py-3 px-4 text-muted">{student.className || '-'}</td>
                      <td className="py-3 px-4">
                        {student.timeSlot?.enabled ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20" title={student.timeSlot.slotLabel || 'Custom Shift'}>
                            <FiClock className="w-3 h-3 flex-shrink-0" />
                            <span className="font-mono">{formatMinutesTo12Hour(student.timeSlot.loginTime || '10:00')} - {formatMinutesTo12Hour(student.timeSlot.logoutTime || '19:30')}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted">Default Session</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Switch
                          checked={student.active}
                          onChange={() => handleToggleActive(student)}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-muted">{student.signatureCount || 0}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/students/${student.id}`)}
                            className="p-1.5 rounded-token border border-line text-muted hover:text-primary hover:border-primary/40 hover:bg-surface-2 transition-colors"
                            title="View Details"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditStudent(student);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-token border border-line text-muted hover:text-primary hover:border-primary/40 hover:bg-surface-2 transition-colors"
                            title="Edit Student"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteId(student.id);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-token border border-line text-muted hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-colors"
                            title="Delete Student"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack (screens under 640px) */}
          <div className="sm:hidden space-y-3">
            {students.map((student) => (
              <Card key={student.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary overflow-hidden flex-shrink-0">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-main font-poppins">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                          className="hover:text-primary cursor-pointer text-left focus:outline-none focus:underline"
                        >
                          {student.name}
                        </button>
                      </h4>
                      <p className="text-xs text-muted font-mono">Roll: {student.rollNo}</p>
                    </div>
                  </div>

                  <Switch
                    checked={student.active}
                    onChange={() => handleToggleActive(student)}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-line text-muted">
                  <a
                    href={`tel:${student.mobile}`}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <FiPhone className="w-3.5 h-3.5" />
                    <span>+91 {student.mobile}</span>
                  </a>
                  <span>{student.className || 'General'}</span>
                </div>

                {student.timeSlot?.enabled && (
                  <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/5 px-2 py-1 rounded border border-primary/15 font-mono">
                    <FiClock className="w-3 h-3 flex-shrink-0" />
                    <span>Shift: {formatMinutesTo12Hour(student.timeSlot.loginTime || '10:00')} - {formatMinutesTo12Hour(student.timeSlot.logoutTime || '19:30')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => navigate(`/admin/students/${student.id}`)}
                  >
                    <FiEye className="w-3.5 h-3.5 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditStudent(student);
                      setEditModalOpen(true);
                    }}
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setDeleteId(student.id);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Edit Student Modal */}
      <StudentForm
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditStudent(null);
        }}
        student={editStudent}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Student Record?"
        message="This will permanently delete the student and their biometric signature from Firestore. Attendance history will be anonymized."
        confirmText="Delete Student"
      />
    </div>
  );
}
