/**
 * Response Formatter for Rive MCP Server
 * Provides beautifully formatted responses with icons, colors, tables, and structured data
 */

// Unicode box-drawing characters
export const BOX = {
  TOP_LEFT: '╔',
  TOP_RIGHT: '╗',
  BOTTOM_LEFT: '╚',
  BOTTOM_RIGHT: '╝',
  HORIZONTAL: '═',
  VERTICAL: '║',
  LIGHT_TOP_LEFT: '┌',
  LIGHT_TOP_RIGHT: '┐',
  LIGHT_BOTTOM_LEFT: '└',
  LIGHT_BOTTOM_RIGHT: '┘',
  LIGHT_HORIZONTAL: '─',
  LIGHT_VERTICAL: '│',
  LIGHT_CROSS: '┼',
  LIGHT_T_DOWN: '┬',
  LIGHT_T_UP: '┴',
  LIGHT_T_RIGHT: '├',
  LIGHT_T_LEFT: '┤',
};

// Icons for different contexts
export const ICONS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  ART: '🎨',
  PACKAGE: '📦',
  TOOL: '🔧',
  LIGHTNING: '⚡',
  CHART: '📊',
  TARGET: '🎯',
  MEMO: '📝',
  ROCKET: '🚀',
  LIBRARY: '📚',
  SEARCH: '🔍',
  RULER: '📐',
  GAME: '🎮',
  SETTINGS: '⚙️',
  LIGHTBULB: '💡',
  GREEN_CIRCLE: '🟢',
  RED_CIRCLE: '🔴',
  YELLOW_CIRCLE: '🟡',
  BLUE_CIRCLE: '🔵',
  CLOCK: '⏱️',
  FILE: '📄',
  FOLDER: '📁',
  SPARKLES: '✨',
  CHECK: '✓',
  CROSS: '✗',
  ARROW: '→',
  BULLET: '•',
};

// ANSI color codes (optional, for terminal output)
export const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',

  // Foreground colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // Background colors
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
};

// Interfaces
export interface FormattedResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface TableRow {
  [key: string]: string | number | boolean | undefined;
}

export interface MetadataInfo {
  timestamp?: string;
  duration?: number;
  counts?: Record<string, number>;
  [key: string]: any;
}

/**
 * Creates a formatted header box
 */
function createHeader(title: string, icon: string = ICONS.INFO, width: number = 60): string {
  const padding = width - 4;
  const titleWithIcon = `  ${icon} ${title}`;
  const spaces = Math.max(0, padding - titleWithIcon.length);

  return [
    BOX.TOP_LEFT + BOX.HORIZONTAL.repeat(width - 2) + BOX.TOP_RIGHT,
    BOX.VERTICAL + titleWithIcon + ' '.repeat(spaces) + BOX.VERTICAL,
    BOX.BOTTOM_LEFT + BOX.HORIZONTAL.repeat(width - 2) + BOX.BOTTOM_RIGHT,
  ].join('\n');
}

/**
 * Creates a section with a title and content
 */
export function formatSection(title: string, content: string, icon?: string): string {
  const lines: string[] = [];

  if (icon) {
    lines.push(`${icon} ${title}`);
  } else {
    lines.push(title);
  }

  lines.push('   ' + content.split('\n').join('\n   '));

  return lines.join('\n');
}

/**
 * Creates a bulleted list
 */
export function formatList(items: string[], icon: string = ICONS.BULLET): string {
  return items.map(item => `   ${icon} ${item}`).join('\n');
}

/**
 * Creates an ASCII table with borders
 */
export function formatTable(headers: string[], rows: TableRow[]): string {
  if (rows.length === 0) {
    return '   (No data)';
  }

  // Calculate column widths
  const columnWidths: number[] = headers.map((header, i) => {
    const headerKey = header.toLowerCase().replace(/\s+/g, '_');
    const maxContentWidth = Math.max(
      ...rows.map(row => {
        const value = row[headerKey] ?? row[header] ?? '';
        return String(value).length;
      })
    );
    return Math.max(header.length, maxContentWidth);
  });

  // Helper to pad cell content
  const padCell = (content: string, width: number): string => {
    return content + ' '.repeat(Math.max(0, width - content.length));
  };

  // Build table
  const lines: string[] = [];
  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + (headers.length - 1) * 3 + 4;

  // Top border
  lines.push(
    BOX.LIGHT_TOP_LEFT +
    BOX.LIGHT_HORIZONTAL.repeat(totalWidth - 2) +
    BOX.LIGHT_TOP_RIGHT
  );

  // Header row
  const headerRow = headers
    .map((header, i) => padCell(header, columnWidths[i]))
    .join(' ' + BOX.LIGHT_VERTICAL + ' ');
  lines.push(BOX.LIGHT_VERTICAL + ' ' + headerRow + ' ' + BOX.LIGHT_VERTICAL);

  // Header separator
  const separator = columnWidths
    .map(width => BOX.LIGHT_HORIZONTAL.repeat(width + 2))
    .join(BOX.LIGHT_CROSS);
  lines.push(
    BOX.LIGHT_T_RIGHT +
    separator +
    BOX.LIGHT_T_LEFT
  );

  // Data rows
  rows.forEach(row => {
    const cells = headers.map((header, i) => {
      const headerKey = header.toLowerCase().replace(/\s+/g, '_');
      const value = row[headerKey] ?? row[header] ?? '';
      return padCell(String(value), columnWidths[i]);
    });
    const rowText = cells.join(' ' + BOX.LIGHT_VERTICAL + ' ');
    lines.push(BOX.LIGHT_VERTICAL + ' ' + rowText + ' ' + BOX.LIGHT_VERTICAL);
  });

  // Bottom border
  lines.push(
    BOX.LIGHT_BOTTOM_LEFT +
    BOX.LIGHT_HORIZONTAL.repeat(totalWidth - 2) +
    BOX.LIGHT_BOTTOM_RIGHT
  );

  return lines.join('\n');
}

/**
 * Formats metadata information
 */
export function formatMetadata(metadata: MetadataInfo): string {
  const lines: string[] = [];

  if (metadata.duration !== undefined) {
    lines.push(`${ICONS.CLOCK} Completed in ${metadata.duration}ms`);
  }

  if (metadata.counts) {
    Object.entries(metadata.counts).forEach(([key, value]) => {
      lines.push(`${ICONS.CHART} ${key}: ${value}`);
    });
  }

  return lines.join('\n');
}

/**
 * Formats a success response
 */
export function formatSuccess(
  toolName: string,
  data: any,
  options: {
    title?: string;
    summary?: string;
    metadata?: MetadataInfo;
    nextSteps?: string[];
    sections?: Array<{ title: string; content: string; icon?: string }>;
  } = {}
): FormattedResponse {
  const parts: string[] = [];
  const startTime = options.metadata?.timestamp ? new Date(options.metadata.timestamp).getTime() : Date.now();
  const duration = options.metadata?.duration ?? (Date.now() - startTime);

  // Header
  const title = options.title || toolName.toUpperCase().replace(/_/g, ' ');
  parts.push(createHeader(title, ICONS.SUCCESS, 60));
  parts.push('');

  // Success indicator
  parts.push(`${ICONS.SUCCESS} Query successful (${duration}ms)`);
  parts.push('');

  // Summary
  if (options.summary) {
    parts.push(`${ICONS.CHART} Summary: ${options.summary}`);
    parts.push('');
  }

  // Custom sections
  if (options.sections) {
    options.sections.forEach(section => {
      parts.push(formatSection(section.title, section.content, section.icon));
      parts.push('');
    });
  }

  // Next steps
  if (options.nextSteps && options.nextSteps.length > 0) {
    parts.push(`${ICONS.LIGHTBULB} Next Steps:`);
    parts.push(formatList(options.nextSteps));
  }

  return {
    content: [{
      type: 'text',
      text: parts.join('\n'),
    }],
  };
}

/**
 * Formats an error response
 */
export function formatError(
  toolName: string,
  error: { code: string; message: string; details?: any },
  options: {
    title?: string;
    context?: Record<string, any>;
    suggestions?: string[];
    metadata?: MetadataInfo;
  } = {}
): FormattedResponse {
  const parts: string[] = [];
  const duration = options.metadata?.duration ?? 0;

  // Header
  const title = options.title || `${error.code.replace(/_/g, ' ')}`;
  parts.push(createHeader(title, ICONS.ERROR, 60));
  parts.push('');

  // Error message
  parts.push(`${ICONS.RED_CIRCLE} Error: ${error.message}`);
  parts.push('');

  // Context details
  if (options.context && Object.keys(options.context).length > 0) {
    parts.push(`${ICONS.MEMO} Details:`);
    Object.entries(options.context).forEach(([key, value]) => {
      parts.push(`   ${ICONS.BULLET} ${key}: ${value}`);
    });
    parts.push('');
  }

  // Suggestions
  if (options.suggestions && options.suggestions.length > 0) {
    parts.push(`${ICONS.TOOL} Suggestions:`);
    options.suggestions.forEach((suggestion, index) => {
      parts.push(`   ${index + 1}. ${suggestion}`);
    });
    parts.push('');
  }

  // Timing
  if (duration > 0) {
    parts.push(`${ICONS.CLOCK} Failed after ${duration}ms`);
  }

  return {
    content: [{
      type: 'text',
      text: parts.join('\n'),
    }],
    isError: true,
  };
}

/**
 * Formats a table-based response (for list operations)
 */
export function formatTableResponse(
  toolName: string,
  headers: string[],
  rows: TableRow[],
  options: {
    title?: string;
    summary?: string;
    metadata?: MetadataInfo;
    nextSteps?: string[];
  } = {}
): FormattedResponse {
  const parts: string[] = [];
  const startTime = options.metadata?.timestamp ? new Date(options.metadata.timestamp).getTime() : Date.now();
  const duration = options.metadata?.duration ?? (Date.now() - startTime);

  // Header
  const title = options.title || toolName.toUpperCase().replace(/_/g, ' ');
  parts.push(createHeader(title, ICONS.LIBRARY, 60));
  parts.push('');

  // Success indicator
  parts.push(`${ICONS.SUCCESS} Query successful (${duration}ms)`);
  parts.push('');

  // Summary
  if (options.summary) {
    parts.push(`${ICONS.CHART} Summary: ${options.summary}`);
    parts.push('');
  }

  // Table
  parts.push(formatTable(headers, rows));
  parts.push('');

  // Next steps
  if (options.nextSteps && options.nextSteps.length > 0) {
    parts.push(`${ICONS.LIGHTBULB} Next Steps:`);
    parts.push(formatList(options.nextSteps));
  }

  return {
    content: [{
      type: 'text',
      text: parts.join('\n'),
    }],
  };
}

/**
 * Formats hierarchical data (for detail views)
 */
export function formatHierarchical(
  toolName: string,
  sections: Array<{
    title: string;
    icon?: string;
    items?: Array<{ label: string; value: any }>;
    content?: string;
    table?: { headers: string[]; rows: TableRow[] };
  }>,
  options: {
    title?: string;
    metadata?: MetadataInfo;
  } = {}
): FormattedResponse {
  const parts: string[] = [];
  const startTime = options.metadata?.timestamp ? new Date(options.metadata.timestamp).getTime() : Date.now();
  const duration = options.metadata?.duration ?? (Date.now() - startTime);

  // Header
  const title = options.title || toolName.toUpperCase().replace(/_/g, ' ');
  parts.push(createHeader(title, ICONS.INFO, 60));
  parts.push('');

  // Success indicator
  parts.push(`${ICONS.SUCCESS} Query successful (${duration}ms)`);
  parts.push('');

  // Process each section
  sections.forEach((section, index) => {
    const icon = section.icon || ICONS.FOLDER;
    parts.push(`${icon} ${section.title}`);
    parts.push('');

    if (section.items) {
      section.items.forEach(item => {
        const value = typeof item.value === 'object'
          ? JSON.stringify(item.value, null, 2).split('\n').join('\n      ')
          : item.value;
        parts.push(`   ${ICONS.ARROW} ${item.label}: ${value}`);
      });
      parts.push('');
    }

    if (section.content) {
      parts.push('   ' + section.content.split('\n').join('\n   '));
      parts.push('');
    }

    if (section.table) {
      parts.push(formatTable(section.table.headers, section.table.rows));
      parts.push('');
    }
  });

  return {
    content: [{
      type: 'text',
      text: parts.join('\n'),
    }],
  };
}

/**
 * Helper to calculate duration from timestamp
 */
export function calculateDuration(startTimestamp: string): number {
  const start = new Date(startTimestamp).getTime();
  const now = Date.now();
  return Math.max(0, now - start);
}
