/**
 * PDF Report Generator for FaceAttend System.
 * Generates official, styled Daily and Monthly Attendance reports using jsPDF & autoTable.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTimeDisplay, formatDateDisplay, formatLateDuration } from './time.js';

/**
 * Draws common header and branding on the PDF document.
 */
function drawHeader(doc, title, subtitle) {
  // Top Banner Accent Bar
  doc.setFillColor(79, 70, 229); // Primary Indigo (#4F46E5)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 8, 'F');

  // Institution / Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('FaceAttend Biometric System', 14, 20);

  // Report Title
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  doc.text(title.toUpperCase(), 14, 28);

  // Subtitle / Date Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(subtitle, 14, 34);

  // Divider line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 38, doc.internal.pageSize.getWidth() - 14, 38);
}

/**
 * Adds page numbers and timestamp footer to all pages.
 */
function addFooters(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('FaceAttend Automated Biometric Attendance System • Official Institutional Report', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * Generates and downloads a Daily Attendance Report PDF.
 * @param {object} params
 * @param {string} params.dateKey - 'YYYY-MM-DD'
 * @param {Array} params.studentRoster - Complete list of students with attendance status
 * @param {object} params.summary - { total, present, late, absent, rate }
 */
export function generateDailyReportPdf({ dateKey, studentRoster = [], summary = {} }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const formattedDate = formatDateDisplay(dateKey);
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  drawHeader(
    doc,
    `Daily Attendance Report — ${formattedDate}`,
    `Attendance Date: ${dateKey} (${formattedDate})  •  Generated on: ${nowStr}`
  );

  // Draw Summary KPI Box
  const startY = 44;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 22, 2, 2, 'S');

  const kpis = [
    { label: 'Total Enrolled', value: String(summary.total ?? studentRoster.length), color: [30, 41, 59] },
    { label: 'Present', value: String(summary.present ?? 0), color: [22, 163, 74] }, // Green
    { label: 'Late Arrival', value: String(summary.late ?? 0), color: [217, 119, 6] }, // Amber
    { label: 'Absent / Unmarked', value: String(summary.absent ?? 0), color: [220, 38, 38] }, // Red
    { label: 'Attendance Rate', value: `${summary.rate ?? 0}%`, color: [79, 70, 229] } // Indigo
  ];

  const colWidth = (doc.internal.pageSize.getWidth() - 28) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * colWidth + colWidth / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x, startY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x, startY + 16, { align: 'center' });
  });

  // Table Body preparation
  const tableData = studentRoster.map((s, index) => {
    let statusText = 'ABSENT';
    if (s.status === 'present') statusText = 'PRESENT';
    else if (s.status === 'late') statusText = 'LATE';

    const checkInTime = s.markedAt ? formatTimeDisplay(s.markedAt) : '--';
    const checkOutTime = s.logoutAt ? formatTimeDisplay(s.logoutAt) : (s.isRecorded ? '-' : '--');
    const lateText = s.lateMinutes > 0 ? formatLateDuration(s.lateMinutes, { prefix: true }) : '-';
    const sessionText = s.slotLabel || (s.session ? s.session.toUpperCase() : '-');

    return [
      String(index + 1),
      s.rollNo || '-',
      s.name || '-',
      s.className || 'General',
      sessionText,
      statusText,
      checkInTime,
      checkOutTime,
      lateText
    ];
  });

  autoTable(doc, {
    startY: startY + 28,
    head: [['#', 'Roll No', 'Student Name', 'Class', 'Session / Shift', 'Status', 'Check-In', 'Check-Out', 'Lateness']],
    body: tableData,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 20 },
      4: { cellWidth: 28 },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 14, halign: 'center' }
    },
    didParseCell: (data) => {
      // Color-code Status column
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw;
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [22, 163, 74];
        } else if (val === 'LATE') {
          data.cell.styles.textColor = [217, 119, 6];
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });

  addFooters(doc);
  doc.save(`Daily-Attendance-Report-${dateKey}.pdf`);
}

/**
 * Generates and downloads a Monthly Attendance Report PDF.
 * @param {object} params
 * @param {string} params.monthYear - 'YYYY-MM'
 * @param {string} params.monthName - e.g. 'October 2026'
 * @param {Array} params.studentStats - Aggregated monthly metrics per student
 * @param {object} params.summary - { totalStudents, totalCheckIns, avgRate, totalLate }
 */
export function generateMonthlyReportPdf({ monthYear, monthName, studentStats = [], summary = {} }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  drawHeader(
    doc,
    `Monthly Attendance Summary — ${monthName || monthYear}`,
    `Billing / Academic Month: ${monthName || monthYear}  •  Generated on: ${nowStr}`
  );

  // Draw Summary KPI Box
  const startY = 44;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, doc.internal.pageSize.getWidth() - 28, 22, 2, 2, 'S');

  const kpis = [
    { label: 'Total Students', value: String(summary.totalStudents ?? studentStats.length), color: [30, 41, 59] },
    { label: 'Total Check-Ins', value: String(summary.totalCheckIns ?? 0), color: [79, 70, 229] },
    { label: 'Late Marks', value: String(summary.totalLate ?? 0), color: [217, 119, 6] },
    { label: 'Avg Monthly Rate', value: `${summary.avgRate ?? 0}%`, color: [22, 163, 74] }
  ];

  const colWidth = (doc.internal.pageSize.getWidth() - 28) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * colWidth + colWidth / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x, startY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x, startY + 16, { align: 'center' });
  });

  // Table Body preparation
  const tableData = studentStats.map((s, index) => {
    return [
      String(index + 1),
      s.rollNo || '-',
      s.name || '-',
      s.className || 'General',
      String(s.presentCount ?? 0),
      String(s.lateCount ?? 0),
      String(s.absentCount ?? 0),
      formatLateDuration(s.totalLateMinutes),
      `${s.rate ?? 0}%`
    ];
  });

  autoTable(doc, {
    startY: startY + 28,
    head: [['#', 'Roll No', 'Student Name', 'Class', 'Present', 'Late', 'Absent', 'Total Late', 'Attendance %']],
    body: tableData,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 46 },
      3: { cellWidth: 24 },
      4: { cellWidth: 16, halign: 'center', textColor: [22, 163, 74], fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center', textColor: [217, 119, 6], fontStyle: 'bold' },
      6: { cellWidth: 16, halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Highlight low attendance rates
      if (data.section === 'body' && data.column.index === 8) {
        const rate = parseInt(data.cell.raw, 10);
        if (!isNaN(rate)) {
          if (rate < 75) {
            data.cell.styles.textColor = [220, 38, 38]; // Red (< 75%)
          } else if (rate < 85) {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
          } else {
            data.cell.styles.textColor = [22, 163, 74]; // Green
          }
        }
      }
    }
  });

  addFooters(doc);
  doc.save(`Monthly-Attendance-Report-${monthYear}.pdf`);
}
