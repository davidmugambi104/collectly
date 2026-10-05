/**
 * Small RFC 4180 CSV reader. No dependency.
 *
 * Handles quoted fields, "" as an escaped quote, line breaks inside quotes, CRLF / LF / CR, a leading byte order
 * mark, and a comma, semicolon or tab delimiter (picked from the first line, outside quotes). Never evaluates
 * anything: every cell is returned as a plain string.
 */
export type ParsedCsv = { delimiter: ',' | ';' | '\t'; rows: string[][]; truncated: boolean };

export function detectDelimiter(text: string): ',' | ';' | '\t' {
  let inQuotes = false;
  const count = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === '\n' || ch === '\r') break;
      if (ch === ',' || ch === ';' || ch === '\t') count[ch]++;
    }
  }
  if (count['\t'] > count[','] && count['\t'] > count[';']) return '\t';
  if (count[';'] > count[',']) return ';';
  return ',';
}

/** `maxRows` counts data rows after the header; parsing stops one row past it and sets `truncated`. */
export function parseCsv(input: string, opts: { delimiter?: ',' | ';' | '\t'; maxRows?: number } = {}): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = opts.delimiter ?? detectDelimiter(text);
  const limit = opts.maxRows === undefined ? Infinity : opts.maxRows + 1; // + header
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let truncated = false;

  const endRow = (): boolean => {
    row.push(field);
    field = '';
    // A completely empty line is not a row.
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
    if (rows.length > limit) { truncated = true; rows.length = limit; return true; }
    return false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (endRow()) return { delimiter, rows, truncated };
    } else field += ch;
  }
  if (field !== '' || row.length > 0) endRow();
  return { delimiter, rows, truncated };
}
