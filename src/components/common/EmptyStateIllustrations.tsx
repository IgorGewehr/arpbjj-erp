'use client';

import { Box, useTheme } from '@mui/material';

// ============================================
// Base SVG Wrapper
// ============================================
interface IllustrationProps {
  size?: number;
}

// ============================================
// Empty Competitions - Trophy
// ============================================
export function EmptyCompetitionsIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Trophy body */}
      <path
        d="M40 25h40v15c0 15-10 28-20 35-10-7-20-20-20-35V25z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left handle */}
      <path
        d="M40 35c-12 0-18 8-18 18s6 18 18 18"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right handle */}
      <path
        d="M80 35c12 0 18 8 18 18s-6 18-18 18"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Trophy stem */}
      <rect x="52" y="75" width="16" height="12" fill={strokeColor} rx="2" />
      {/* Trophy base */}
      <rect x="40" y="87" width="40" height="8" fill={strokeColor} rx="3" />
      {/* Star decoration */}
      <path
        d="M60 40l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Box>
  );
}

// ============================================
// Empty Students - Person with Gi
// ============================================
export function EmptyStudentsIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Head */}
      <circle
        cx="60"
        cy="32"
        r="16"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
      />
      {/* Body (kimono shape) */}
      <path
        d="M35 95c0-22 11-35 25-35s25 13 25 35"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Gi lapel left */}
      <path
        d="M48 60l-8 35"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Gi lapel right */}
      <path
        d="M72 60l8 35"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Belt */}
      <rect x="42" y="78" width="36" height="6" fill={strokeColor} rx="2" />
      {/* Belt knot */}
      <circle cx="60" cy="81" r="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
    </Box>
  );
}

// ============================================
// Empty Timeline - Clock/Calendar
// ============================================
export function EmptyTimelineIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Timeline line */}
      <line
        x1="30"
        y1="15"
        x2="30"
        y2="105"
        stroke={strokeColor}
        strokeWidth="3"
        strokeDasharray="8 6"
        strokeLinecap="round"
      />
      {/* Timeline dot 1 */}
      <circle
        cx="30"
        cy="28"
        r="10"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {/* Content placeholder 1 */}
      <rect x="50" y="20" width="50" height="16" fill={fillColor} rx="3" />
      {/* Timeline dot 2 */}
      <circle
        cx="30"
        cy="60"
        r="10"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {/* Content placeholder 2 */}
      <rect x="50" y="52" width="40" height="16" fill={fillColor} rx="3" />
      {/* Timeline dot 3 */}
      <circle
        cx="30"
        cy="92"
        r="10"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {/* Content placeholder 3 */}
      <rect x="50" y="84" width="45" height="16" fill={fillColor} rx="3" />
    </Box>
  );
}

// ============================================
// Empty Financial - Document with Money
// ============================================
export function EmptyFinancialIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Document */}
      <rect
        x="25"
        y="15"
        width="55"
        height="75"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
        rx="4"
      />
      {/* Document lines */}
      <line x1="35" y1="35" x2="70" y2="35" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="50" x2="60" y2="50" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="65" x2="65" y2="65" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      {/* Coin circle */}
      <circle
        cx="85"
        cy="80"
        r="22"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
      />
      {/* Dollar sign */}
      <text
        x="85"
        y="88"
        textAnchor="middle"
        fill={strokeColor}
        fontSize="22"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        $
      </text>
    </Box>
  );
}

// ============================================
// Empty Attendance - Calendar
// ============================================
export function EmptyAttendanceIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Calendar body */}
      <rect
        x="20"
        y="25"
        width="80"
        height="75"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
        rx="6"
      />
      {/* Calendar header */}
      <rect
        x="20"
        y="25"
        width="80"
        height="20"
        fill={strokeColor}
        rx="6"
      />
      <rect
        x="20"
        y="38"
        width="80"
        height="10"
        fill={strokeColor}
      />
      {/* Calendar rings */}
      <rect x="35" y="18" width="6" height="14" fill={strokeColor} rx="2" />
      <rect x="79" y="18" width="6" height="14" fill={strokeColor} rx="2" />
      {/* Calendar grid */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={30 + col * 17}
            y={55 + row * 15}
            width="12"
            height="10"
            fill={fillColor}
            rx="2"
          />
        ))
      )}
    </Box>
  );
}

// ============================================
// Empty Classes - Group Icon
// ============================================
export function EmptyClassesIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Center person */}
      <circle cx="60" cy="35" r="12" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
      <path
        d="M42 85c0-15 8-25 18-25s18 10 18 25"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {/* Left person */}
      <circle cx="28" cy="45" r="10" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
      <path
        d="M14 90c0-12 6-20 14-20s14 8 14 20"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {/* Right person */}
      <circle cx="92" cy="45" r="10" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
      <path
        d="M78 90c0-12 6-20 14-20s14 8 14 20"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
    </Box>
  );
}

// ============================================
// Empty Reports - Chart
// ============================================
export function EmptyReportsIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Chart background */}
      <rect
        x="20"
        y="20"
        width="80"
        height="70"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        rx="4"
      />
      {/* Y axis */}
      <line x1="35" y1="30" x2="35" y2="80" stroke={strokeColor} strokeWidth="2" />
      {/* X axis */}
      <line x1="35" y1="80" x2="90" y2="80" stroke={strokeColor} strokeWidth="2" />
      {/* Bars */}
      <rect x="42" y="55" width="10" height="25" fill={strokeColor} rx="2" />
      <rect x="57" y="40" width="10" height="40" fill={strokeColor} rx="2" />
      <rect x="72" y="50" width="10" height="30" fill={strokeColor} rx="2" />
      {/* Trend line */}
      <path
        d="M47 52 L62 38 L77 48"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 3"
      />
    </Box>
  );
}

// ============================================
// Empty Search Results
// ============================================
export function EmptySearchIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Magnifying glass circle */}
      <circle
        cx="50"
        cy="50"
        r="28"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="4"
      />
      {/* Magnifying glass handle */}
      <line
        x1="70"
        y1="70"
        x2="95"
        y2="95"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Question mark */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fill={strokeColor}
        fontSize="28"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        ?
      </text>
    </Box>
  );
}

// ============================================
// Empty Notifications
// ============================================
export function EmptyNotificationsIllustration({ size = 120 }: IllustrationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const strokeColor = isDark ? '#555' : '#E0E0E0';
  const fillColor = isDark ? '#333' : '#F5F5F5';

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      sx={{ display: 'block' }}
    >
      {/* Bell body */}
      <path
        d="M60 20c-18 0-30 15-30 35v15c0 5-5 10-10 10h80c-5 0-10-5-10-10V55c0-20-12-35-30-35z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Bell clapper */}
      <circle cx="60" cy="95" r="8" fill={strokeColor} />
      {/* Bell top */}
      <path
        d="M55 20c0-3 2-5 5-5s5 2 5 5"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* "Zzz" for sleep/no notifications */}
      <text
        x="85"
        y="30"
        fill={strokeColor}
        fontSize="14"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        z
      </text>
      <text
        x="92"
        y="22"
        fill={strokeColor}
        fontSize="12"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        z
      </text>
    </Box>
  );
}
