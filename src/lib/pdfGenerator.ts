import jsPDF from 'jspdf';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttendanceReportParams {
  academyName: string;
  academyLogoUrl?: string;
  classes: Array<{
    id: string;
    name: string;
    instructorName?: string;
    students: Array<{
      name: string;
      attendanceCount: number;
    }>;
  }>;
  classDays: Array<{
    date: Date;
    classNames: string[];
  }>;
  periodLabel: string; // e.g., "Março/2026"
  startDate: Date;
  endDate: Date;
}

export interface AthleteCurriculumParams {
  academyName: string;
  academyLogoUrl?: string;
  student: {
    fullName: string;
    nickname?: string;
    photoUrl?: string;
    photoBase64?: string;
    birthDate?: Date;
    age?: number;
    cpf?: string;
    rg?: string;
    phone?: string;
    email?: string;
    category: string;
    weight?: number;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
    guardian?: {
      name: string;
      phone?: string;
      relationship?: string;
    };
    currentBelt: string;
    currentStripes: number;
    jiujitsuStartDate?: Date;
    startDate?: Date;
    attendanceCount?: number;
    bloodType?: string;
    allergies?: string[];
    healthNotes?: string;
    emergencyContact?: {
      name: string;
      phone?: string;
      relationship?: string;
    };
    beltHistory?: Array<{
      belt: string;
      stripes: number;
      date: Date;
      notes?: string;
    }>;
    sports?: Array<{
      sportName: string;
      currentGrade: string;
      currentStripes: number;
    }>;
    classes?: string[];
    status: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const MAX_Y = PAGE_HEIGHT - MARGIN_BOTTOM;

const COLOR_HEADER_BG: RGB = [26, 26, 46]; // #1a1a2e
const COLOR_HEADER_TEXT: RGB = [255, 255, 255];
const COLOR_SECTION_BG: RGB = [37, 41, 88]; // #252958
const COLOR_ROW_ALT: RGB = [248, 249, 250]; // #f8f9fa
const COLOR_ROW_WHITE: RGB = [255, 255, 255];
const COLOR_TABLE_BORDER: RGB = [222, 226, 230]; // #dee2e6
const COLOR_TEXT_PRIMARY: RGB = [33, 37, 41]; // #212529
const COLOR_TEXT_SECONDARY: RGB = [108, 117, 125]; // #6c757d
const COLOR_ACCENT: RGB = [37, 99, 235]; // #2563eb

const WEEKDAYS_PT = [
  'Domingo',
  'Segunda-feira',
  'Terca-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sabado',
];

const BELT_COLORS: Record<string, string> = {
  white: '#FFFFFF',
  branca: '#FFFFFF',
  blue: '#0066CC',
  azul: '#0066CC',
  purple: '#6B21A8',
  roxa: '#6B21A8',
  brown: '#8B4513',
  marrom: '#8B4513',
  black: '#000000',
  preta: '#000000',
  grey: '#808080',
  cinza: '#808080',
  yellow: '#FFD700',
  amarela: '#FFD700',
  orange: '#FF8C00',
  laranja: '#FF8C00',
  green: '#228B22',
  verde: '#228B22',
};

type RGB = [number, number, number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if we need a new page and add one if so.
 * Returns the (possibly reset) y position.
 */
function ensureSpace(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight > MAX_Y) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

/** Draw footer with page number and generation date on every page. */
function drawFooter(doc: jsPDF, generationDate: string, extraText?: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);

    const footerY = PAGE_HEIGHT - 10;
    doc.text(`Gerado em ${generationDate}`, MARGIN_LEFT, footerY);
    if (extraText) {
      doc.text(extraText, PAGE_WIDTH / 2, footerY, { align: 'center' });
    }
    doc.text(`Pagina ${i} de ${pageCount}`, PAGE_WIDTH - MARGIN_RIGHT, footerY, {
      align: 'right',
    });
  }
}

/** Format a Date to DD/MM/YYYY */
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Format a Date to DD/MM/YYYY HH:mm */
function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/** Hex color string to RGB tuple. */
function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

/**
 * Draw a horizontal line across the content area.
 */
function drawHLine(doc: jsPDF, y: number, color: RGB = COLOR_TABLE_BORDER) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
}

/**
 * Split text to fit within a given width, returning lines.
 */
function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

// ---------------------------------------------------------------------------
// Function 1: Attendance Report
// ---------------------------------------------------------------------------

export function generateAttendanceReportPDF(params: AttendanceReportParams): jsPDF {
  const { academyName, classes, classDays, periodLabel } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const generationDate = formatDateTime(now);

  let y = MARGIN_TOP;

  // ---- Header bar ----
  const headerHeight = 28;
  doc.setFillColor(...COLOR_HEADER_BG);
  doc.rect(0, 0, PAGE_WIDTH, headerHeight, 'F');

  // Academy name - left side
  // NOTE: If academyLogoUrl is provided, a logo could be placed here to the left
  // of the academy name. Since jsPDF cannot fetch external URLs synchronously,
  // the caller should convert the logo to base64 and use doc.addImage() after
  // receiving the returned doc object, or pass a base64 string.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_HEADER_TEXT);
  doc.text(academyName, MARGIN_LEFT, 12);

  // Period label - right side
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Lista de Presencas - ${periodLabel}`, PAGE_WIDTH - MARGIN_RIGHT, 12, {
    align: 'right',
  });

  // Date range subtitle
  doc.setFontSize(9);
  doc.text(
    `Periodo: ${formatDate(params.startDate)} a ${formatDate(params.endDate)}`,
    PAGE_WIDTH - MARGIN_RIGHT,
    20,
    { align: 'right' },
  );

  y = headerHeight + 10;

  // ---- Class sections ----
  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci];
    const sortedStudents = [...cls.students].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );

    // Section header
    const sectionHeaderHeight = cls.instructorName ? 18 : 14;
    y = ensureSpace(doc, y, sectionHeaderHeight + 12);

    doc.setFillColor(...COLOR_SECTION_BG);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, sectionHeaderHeight, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_HEADER_TEXT);
    doc.text(cls.name, MARGIN_LEFT + 6, y + 8);

    if (cls.instructorName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Professor(a): ${cls.instructorName}`, MARGIN_LEFT + 6, y + 14.5);
    }

    y += sectionHeaderHeight + 4;

    // Table header
    const tableHeaderHeight = 8;
    const colNameX = MARGIN_LEFT;
    const colCountX = PAGE_WIDTH - MARGIN_RIGHT - 30;
    const colCountWidth = 30;

    y = ensureSpace(doc, y, tableHeaderHeight + 4);
    doc.setFillColor(55, 65, 81); // #374151
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, tableHeaderHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_HEADER_TEXT);
    doc.text('Nome', colNameX + 4, y + 5.5);
    doc.text('Presencas', colCountX + colCountWidth - 4, y + 5.5, { align: 'right' });

    y += tableHeaderHeight;

    // Table rows
    const rowHeight = 7;
    for (let si = 0; si < sortedStudents.length; si++) {
      y = ensureSpace(doc, y, rowHeight);
      const student = sortedStudents[si];
      const isAlt = si % 2 === 0;

      // Row background
      doc.setFillColor(...(isAlt ? COLOR_ROW_ALT : COLOR_ROW_WHITE));
      doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, rowHeight, 'F');

      // Row border bottom
      doc.setDrawColor(...COLOR_TABLE_BORDER);
      doc.setLineWidth(0.2);
      doc.line(MARGIN_LEFT, y + rowHeight, PAGE_WIDTH - MARGIN_RIGHT, y + rowHeight);

      // Student name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXT_PRIMARY);
      const nameMaxWidth = colCountX - colNameX - 8;
      const truncatedName = truncateText(doc, student.name, nameMaxWidth);
      doc.text(truncatedName, colNameX + 4, y + 5);

      // Attendance count
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_ACCENT);
      doc.text(
        String(student.attendanceCount),
        colCountX + colCountWidth - 4,
        y + 5,
        { align: 'right' },
      );

      y += rowHeight;
    }

    // Total row
    y = ensureSpace(doc, y, rowHeight + 2);
    doc.setFillColor(230, 235, 245); // light accent
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, rowHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_PRIMARY);
    doc.text(`Total de alunos: ${sortedStudents.length}`, colNameX + 4, y + 5);

    const totalAttendance = sortedStudents.reduce((sum, s) => sum + s.attendanceCount, 0);
    doc.text(
      String(totalAttendance),
      colCountX + colCountWidth - 4,
      y + 5,
      { align: 'right' },
    );

    y += rowHeight + 10;
  }

  // ---- Class days section ----
  if (classDays.length > 0) {
    const sortedDays = [...classDays].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Section title
    const sectionTitleHeight = 14;
    y = ensureSpace(doc, y, sectionTitleHeight + 20);

    doc.setFillColor(...COLOR_SECTION_BG);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, sectionTitleHeight, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_HEADER_TEXT);
    doc.text('RELACAO DE DIAS DE AULA', MARGIN_LEFT + 6, y + 9);
    y += sectionTitleHeight + 6;

    // Days list
    const dayEntryHeight = 7;
    for (let di = 0; di < sortedDays.length; di++) {
      const dayInfo = sortedDays[di];
      const classNamesText = dayInfo.classNames.join(', ');
      const lines = splitText(doc, classNamesText, CONTENT_WIDTH - 70);
      const entryHeight = Math.max(dayEntryHeight, lines.length * 4 + 3);

      y = ensureSpace(doc, y, entryHeight);

      // Alternating background
      const isAlt = di % 2 === 0;
      doc.setFillColor(...(isAlt ? COLOR_ROW_ALT : COLOR_ROW_WHITE));
      doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, entryHeight, 'F');

      // Border
      doc.setDrawColor(...COLOR_TABLE_BORDER);
      doc.setLineWidth(0.2);
      doc.line(MARGIN_LEFT, y + entryHeight, PAGE_WIDTH - MARGIN_RIGHT, y + entryHeight);

      // Day number with circle accent
      const dayNum = String(dayInfo.date.getDate()).padStart(2, '0');
      const weekday = WEEKDAYS_PT[dayInfo.date.getDay()];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_ACCENT);
      doc.text(`Dia ${dayNum}`, MARGIN_LEFT + 4, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_TEXT_SECONDARY);
      doc.text(`- ${weekday}`, MARGIN_LEFT + 22, y + 5);

      // Class names
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_TEXT_PRIMARY);
      for (let li = 0; li < lines.length; li++) {
        doc.text(lines[li], MARGIN_LEFT + 62, y + 5 + li * 4);
      }

      y += entryHeight;
    }

    // Summary
    y = ensureSpace(doc, y, 10);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_PRIMARY);
    doc.text(`Total de dias de aula: ${sortedDays.length}`, MARGIN_LEFT, y);
    y += 8;
  }

  // ---- Footer on all pages ----
  drawFooter(doc, generationDate, academyName);

  return doc;
}

/** Truncate text with ellipsis if it exceeds a given width. */
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  const textWidth = doc.getTextWidth(text);
  if (textWidth <= maxWidth) return text;

  let truncated = text;
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

// ---------------------------------------------------------------------------
// Function 2: Athlete Curriculum
// ---------------------------------------------------------------------------

export function generateAthleteCurriculumPDF(params: AthleteCurriculumParams): jsPDF {
  const { academyName, student } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const generationDate = formatDateTime(now);

  let y = MARGIN_TOP;

  // ---- Header bar ----
  const headerHeight = 24;
  doc.setFillColor(...COLOR_HEADER_BG);
  doc.rect(0, 0, PAGE_WIDTH, headerHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_HEADER_TEXT);
  doc.text(academyName, MARGIN_LEFT, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Curriculo do Atleta', MARGIN_LEFT, 18);

  // Status badge on the right
  const statusText = student.status === 'active' ? 'ATIVO' : student.status.toUpperCase();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const statusColor: RGB =
    student.status === 'active' ? [34, 197, 94] : [239, 68, 68]; // green / red
  doc.setTextColor(...statusColor);
  doc.text(statusText, PAGE_WIDTH - MARGIN_RIGHT, 14, { align: 'right' });

  y = headerHeight + 8;

  // ---- Photo + Name section ----
  const photoWidth = 32;
  const photoHeight = 40;
  const photoX = MARGIN_LEFT;
  const photoY = y;
  const infoX = MARGIN_LEFT + photoWidth + 8;

  // Photo placeholder or image
  if (student.photoBase64) {
    try {
      doc.addImage(student.photoBase64, 'JPEG', photoX, photoY, photoWidth, photoHeight);
    } catch {
      drawPhotoPlaceholder(doc, photoX, photoY, photoWidth, photoHeight);
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoWidth, photoHeight);
  }

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_TEXT_PRIMARY);
  doc.text(student.fullName, infoX, y + 7);

  if (student.nickname) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT_SECONDARY);
    doc.text(`(${student.nickname})`, infoX, y + 14);
  }

  // Belt display next to name
  const beltY = student.nickname ? y + 18 : y + 14;
  drawBeltBadge(doc, infoX, beltY, student.currentBelt, student.currentStripes);

  // Category + classes info
  const categoryLabel =
    student.category === 'kids' ? 'Infantil' : student.category === 'adult' ? 'Adulto' : student.category;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_SECONDARY);
  doc.text(`Categoria: ${categoryLabel}`, infoX, beltY + 12);

  if (student.classes && student.classes.length > 0) {
    doc.text(`Turmas: ${student.classes.join(', ')}`, infoX, beltY + 18);
  }

  y = Math.max(photoY + photoHeight, beltY + 24) + 6;

  // ---- Section: DADOS PESSOAIS ----
  y = drawSectionHeader(doc, y, 'DADOS PESSOAIS');

  const personalFields: Array<[string, string | undefined]> = [
    ['Nome completo', student.fullName],
    ['Data de nascimento', student.birthDate ? formatDate(student.birthDate) : undefined],
    ['Idade', student.age != null ? `${student.age} anos` : undefined],
    ['CPF', student.cpf],
    ['RG', student.rg],
    ['Telefone', student.phone],
    ['E-mail', student.email],
    ['Categoria', categoryLabel],
    ['Peso', student.weight != null ? `${student.weight} kg` : undefined],
  ];
  y = drawFieldGrid(doc, y, personalFields);
  y += 4;

  // ---- Section: ENDERECO ----
  if (student.address) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionHeader(doc, y, 'ENDERECO');

    const addr = student.address;
    const fullAddress = [
      `${addr.street}, ${addr.number}`,
      addr.complement,
      addr.neighborhood,
      `${addr.city} - ${addr.state}`,
      addr.zipCode ? `CEP: ${addr.zipCode}` : undefined,
    ]
      .filter(Boolean)
      .join(' | ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_PRIMARY);
    const addrLines = splitText(doc, fullAddress, CONTENT_WIDTH - 8);
    for (const line of addrLines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN_LEFT + 4, y);
      y += 4.5;
    }
    y += 4;
  }

  // ---- Section: RESPONSAVEL ----
  if (student.guardian) {
    y = ensureSpace(doc, y, 25);
    y = drawSectionHeader(doc, y, 'RESPONSAVEL');

    const guardianFields: Array<[string, string | undefined]> = [
      ['Nome', student.guardian.name],
      ['Telefone', student.guardian.phone],
      ['Parentesco', student.guardian.relationship],
    ];
    y = drawFieldGrid(doc, y, guardianFields);
    y += 4;
  }

  // ---- Section: JIU-JITSU ----
  y = ensureSpace(doc, y, 40);
  y = drawSectionHeader(doc, y, 'JIU-JITSU');

  // Belt display row
  y = ensureSpace(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_SECONDARY);
  doc.text('Faixa atual:', MARGIN_LEFT + 4, y + 1);
  drawBeltBadge(doc, MARGIN_LEFT + 32, y - 4, student.currentBelt, student.currentStripes);
  y += 10;

  const bjjFields: Array<[string, string | undefined]> = [
    [
      'Inicio no Jiu-Jitsu',
      student.jiujitsuStartDate ? formatDate(student.jiujitsuStartDate) : undefined,
    ],
    [
      'Inicio na academia',
      student.startDate ? formatDate(student.startDate) : undefined,
    ],
    [
      'Tempo de treino',
      student.jiujitsuStartDate
        ? calculateTrainingTime(student.jiujitsuStartDate)
        : undefined,
    ],
    [
      'Total de presencas',
      student.attendanceCount != null ? String(student.attendanceCount) : undefined,
    ],
  ];
  y = drawFieldGrid(doc, y, bjjFields);
  y += 4;

  // ---- Section: MODALIDADES ----
  if (student.sports && student.sports.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeader(doc, y, 'MODALIDADES');

    for (const sport of student.sports) {
      y = ensureSpace(doc, y, 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXT_PRIMARY);
      doc.text(sport.sportName, MARGIN_LEFT + 4, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR_TEXT_SECONDARY);
      const gradeText = `${sport.currentGrade}${sport.currentStripes > 0 ? ` - ${sport.currentStripes} grau(s)` : ''}`;
      doc.text(gradeText, MARGIN_LEFT + 50, y);
      y += 6;
    }
    y += 4;
  }

  // ---- Section: TURMAS ----
  if (student.classes && student.classes.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeader(doc, y, 'TURMAS');

    for (const className of student.classes) {
      y = ensureSpace(doc, y, 6);
      doc.setFillColor(...COLOR_ACCENT);
      doc.circle(MARGIN_LEFT + 6, y - 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXT_PRIMARY);
      doc.text(className, MARGIN_LEFT + 10, y);
      y += 5.5;
    }
    y += 4;
  }

  // ---- Section: HISTORICO DE GRADUACAO ----
  if (student.beltHistory && student.beltHistory.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionHeader(doc, y, 'HISTORICO DE GRADUACAO');

    // Sort by date ascending
    const sortedHistory = [...student.beltHistory].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (let hi = 0; hi < sortedHistory.length; hi++) {
      const entry = sortedHistory[hi];
      const entryHeight = entry.notes ? 16 : 12;
      y = ensureSpace(doc, y, entryHeight);

      // Timeline line
      const timelineX = MARGIN_LEFT + 6;
      if (hi < sortedHistory.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(timelineX, y, timelineX, y + entryHeight);
      }

      // Timeline dot (belt-colored)
      const beltHex = BELT_COLORS[entry.belt.toLowerCase()] || '#808080';
      const beltRgb = hexToRgb(beltHex);
      doc.setFillColor(...beltRgb);
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.3);
      doc.circle(timelineX, y + 1.5, 2.5, 'FD');

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_TEXT_SECONDARY);
      doc.text(formatDate(entry.date), MARGIN_LEFT + 14, y + 1);

      // Belt + stripes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXT_PRIMARY);
      const stripesLabel = entry.stripes > 0 ? ` - ${entry.stripes} grau(s)` : '';
      doc.text(`${capitalizeFirst(entry.belt)}${stripesLabel}`, MARGIN_LEFT + 14, y + 6);

      // Notes
      if (entry.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR_TEXT_SECONDARY);
        doc.text(entry.notes, MARGIN_LEFT + 14, y + 11);
      }

      y += entryHeight;
    }
    y += 4;
  }

  // ---- Section: SAUDE ----
  const hasHealth =
    student.bloodType ||
    (student.allergies && student.allergies.length > 0) ||
    student.healthNotes ||
    student.emergencyContact;

  if (hasHealth) {
    y = ensureSpace(doc, y, 25);
    y = drawSectionHeader(doc, y, 'SAUDE');

    const healthFields: Array<[string, string | undefined]> = [
      ['Tipo sanguineo', student.bloodType],
      [
        'Alergias',
        student.allergies && student.allergies.length > 0
          ? student.allergies.join(', ')
          : undefined,
      ],
      ['Observacoes de saude', student.healthNotes],
    ];
    y = drawFieldGrid(doc, y, healthFields);

    if (student.emergencyContact) {
      y += 2;
      y = ensureSpace(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_ACCENT);
      doc.text('Contato de emergencia', MARGIN_LEFT + 4, y);
      y += 5;

      const emergencyFields: Array<[string, string | undefined]> = [
        ['Nome', student.emergencyContact.name],
        ['Telefone', student.emergencyContact.phone],
        ['Parentesco', student.emergencyContact.relationship],
      ];
      y = drawFieldGrid(doc, y, emergencyFields);
    }
    y += 4;
  }

  // ---- Footer on all pages ----
  drawFooter(doc, generationDate, academyName);

  return doc;
}

// ---------------------------------------------------------------------------
// Drawing helpers for Athlete Curriculum
// ---------------------------------------------------------------------------

/** Draw the placeholder rectangle for missing photos. */
function drawPhotoPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  doc.setFillColor(235, 235, 240);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(170, 170, 180);
  doc.text('FOTO', x + w / 2, y + h / 2 + 2, { align: 'center' });
}

/** Draw a colored section header bar. */
function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  y = ensureSpace(doc, y, 12);
  doc.setFillColor(...COLOR_ACCENT);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 8, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_HEADER_TEXT);
  doc.text(title, MARGIN_LEFT + 4, y + 5.5);

  return y + 12;
}

/** Draw a grid of label-value pairs. Skips undefined/empty values. */
function drawFieldGrid(
  doc: jsPDF,
  y: number,
  fields: Array<[string, string | undefined]>,
): number {
  const filteredFields = fields.filter(([, value]) => value != null && value !== '');
  const labelWidth = 48;
  const colWidth = CONTENT_WIDTH / 2;

  for (let i = 0; i < filteredFields.length; i += 2) {
    y = ensureSpace(doc, y, 6);
    // Left column
    const [label1, value1] = filteredFields[i];
    drawFieldPair(doc, MARGIN_LEFT + 4, y, label1, value1!, labelWidth);

    // Right column (if exists)
    if (i + 1 < filteredFields.length) {
      const [label2, value2] = filteredFields[i + 1];
      drawFieldPair(doc, MARGIN_LEFT + colWidth + 4, y, label2, value2!, labelWidth);
    }

    y += 5.5;
  }

  return y;
}

/** Draw a single label: value pair. */
function drawFieldPair(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelWidth: number,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_SECONDARY);
  doc.text(`${label}:`, x, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_PRIMARY);
  const maxValueWidth = CONTENT_WIDTH / 2 - labelWidth - 4;
  const truncated = truncateText(doc, value, maxValueWidth);
  doc.text(truncated, x + labelWidth, y);
}

/** Draw a belt badge: filled colored rectangle + stripe indicators. */
function drawBeltBadge(
  doc: jsPDF,
  x: number,
  y: number,
  belt: string,
  stripes: number,
) {
  const beltHex = BELT_COLORS[belt.toLowerCase()] || '#808080';
  const beltRgb = hexToRgb(beltHex);
  const beltWidth = 40;
  const beltHeight = 8;

  // Belt rectangle
  doc.setFillColor(...beltRgb);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, beltWidth, beltHeight, 1, 1, 'FD');

  // Belt name text inside
  const isLightBelt =
    belt.toLowerCase() === 'white' ||
    belt.toLowerCase() === 'branca' ||
    belt.toLowerCase() === 'yellow' ||
    belt.toLowerCase() === 'amarela';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isLightBelt ? 50 : 255, isLightBelt ? 50 : 255, isLightBelt ? 50 : 255);
  doc.text(capitalizeFirst(belt), x + 3, y + 5);

  // Stripe indicators (small rectangles on the right end of belt)
  if (stripes > 0) {
    const stripeWidth = 2.5;
    const stripeHeight = 5;
    const stripeGap = 1;
    const stripesStartX = x + beltWidth - (stripes * (stripeWidth + stripeGap)) - 2;
    const stripeY = y + (beltHeight - stripeHeight) / 2;

    for (let s = 0; s < stripes; s++) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);
      doc.rect(
        stripesStartX + s * (stripeWidth + stripeGap),
        stripeY,
        stripeWidth,
        stripeHeight,
        'FD',
      );
    }
  }
}

/** Calculate human-readable training time from a start date. */
function calculateTrainingTime(startDate: Date): string {
  const now = new Date();
  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ano${years > 1 ? 's' : ''}`);
  }
  if (months > 0) {
    parts.push(`${months} mes${months > 1 ? 'es' : ''}`);
  }
  if (parts.length === 0) {
    return 'Menos de 1 mes';
  }
  return parts.join(' e ');
}

/** Capitalize first letter of a string. */
function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
