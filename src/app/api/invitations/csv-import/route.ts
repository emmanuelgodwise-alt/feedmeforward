import { NextRequest, NextResponse } from 'next/server';

// ─── Helper: validate email format ────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── Helper: detect email from text ──────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ─── POST /api/invitations/csv-import ──────────────────────────────
// Parse CSV text and extract/validate email addresses
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { csvText } = body as { csvText?: string };

    if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'csvText is required' }, { status: 400 });
    }

    if (csvText.length > 100000) {
      return NextResponse.json({ success: false, error: 'CSV text too large (max 100KB)' }, { status: 400 });
    }

    // Parse CSV: split by lines and commas
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return NextResponse.json({
        success: true,
        data: { parsed: [], valid: [], invalid: [] },
      });
    }

    // Determine if first line is a header
    const firstLine = lines[0];
    const hasHeader = firstLine.toLowerCase().includes('email') || 
                      firstLine.toLowerCase().includes('e-mail') ||
                      firstLine.toLowerCase().includes('address') ||
                      firstLine.toLowerCase().includes('name');

    // Try to find email column index from header
    let emailColumnIndex = -1;
    if (hasHeader) {
      const headers = parseCSVLine(firstLine);
      emailColumnIndex = headers.findIndex((h) => 
        /email|e-mail|mail|address/i.test(h)
      );
    }

    // Extract all emails from the CSV
    const allEmails: string[] = [];
    const dataLines = hasHeader ? lines.slice(1) : lines;

    for (const line of dataLines) {
      const cells = parseCSVLine(line);

      if (emailColumnIndex >= 0 && emailColumnIndex < cells.length) {
        // Use the detected email column
        const cellEmails = cells[emailColumnIndex].match(EMAIL_REGEX);
        if (cellEmails) {
          allEmails.push(...cellEmails.map((e) => e.trim().toLowerCase()));
        }
      } else {
        // Fall back: scan entire line for email patterns
        const lineEmails = line.match(EMAIL_REGEX);
        if (lineEmails) {
          allEmails.push(...lineEmails.map((e) => e.trim().toLowerCase()));
        }
      }
    }

    // Deduplicate
    const uniqueEmails = [...new Set(allEmails)];

    // Separate valid and invalid
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of uniqueEmails) {
      if (isValidEmail(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        parsed: uniqueEmails,
        valid,
        invalid,
        totalRows: dataLines.length,
        hasHeader,
        emailColumnIndex: emailColumnIndex >= 0 ? emailColumnIndex : null,
      },
    });
  } catch (error) {
    console.error('POST /api/invitations/csv-import error:', error);
    return NextResponse.json({ success: false, error: 'Failed to parse CSV' }, { status: 500 });
  }
}

// ─── Helper: parse a single CSV line ────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';' || char === '\t') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  if (current.trim().length > 0) {
    result.push(current.trim());
  }

  return result;
}
