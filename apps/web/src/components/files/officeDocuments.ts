import JSZip from "jszip";

/** Word and Excel files the file preview renders instead of rejecting them as binary. */
export const isDocxPreviewFile = (path: string): boolean => /\.docx$/i.test(path);
export const isXlsxPreviewFile = (path: string): boolean => /\.xlsx$/i.test(path);

export const MAX_SHEET_ROWS = 500;
export const MAX_SHEET_COLUMNS = 50;

export interface SpreadsheetSheet {
  readonly name: string;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
  /** The sheet has more rows or columns than the preview shows. */
  readonly truncated: boolean;
}

const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELATIONSHIP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELATIONSHIP_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

// Built-in number formats that show a date or time (ECMA-376 part 1, 18.8.30).
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

const elements = (node: Document | Element, name: string, namespace = MAIN_NS) =>
  Array.from(node.getElementsByTagNameNS(namespace, name));

/** All text below an element, such as a shared string with rich-text runs. */
const textOf = (node: Element) =>
  elements(node, "t")
    // Phonetic guides (`rPh`) repeat the text in another script; leave them out.
    .filter((text) => text.parentElement?.localName !== "rPh")
    .map((text) => text.textContent ?? "")
    .join("");

/** Column index from a cell reference such as `AB12`. */
function columnIndex(reference: string): number {
  let index = 0;
  for (const char of reference) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

/** A custom number format shows a date when it has date or time parts outside quotes and brackets. */
function isDateFormatCode(code: string): boolean {
  const unquoted = code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
  return /[dmyhs]/i.test(unquoted) && !/^[#0.,%\s]*$/.test(unquoted);
}

/** An Excel serial date (days since 1899-12-30) as an ISO date, with the time when it has one. */
function serialToIso(serial: number): string {
  const date = new Date(Math.round((serial - 25569) * 86_400_000));
  if (Number.isNaN(date.getTime())) return String(serial);
  const iso = date.toISOString();
  return Number.isInteger(serial) ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

/**
 * Reads an .xlsx workbook's sheets as rows of display text: shared and inline strings, numbers,
 * booleans, formula results and dates. Formatting, merged cells and charts are not shown.
 */
export async function readXlsxWorkbook(
  data: ArrayBuffer | Uint8Array,
): Promise<ReadonlyArray<SpreadsheetSheet>> {
  const zip = await JSZip.loadAsync(data);
  const parser = new DOMParser();
  const readXml = async (path: string) => {
    const file = zip.file(path);
    return file ? parser.parseFromString(await file.async("string"), "application/xml") : null;
  };

  const workbook = await readXml("xl/workbook.xml");
  if (workbook === null) throw new Error("This file is not an Excel workbook.");

  const relationships = new Map<string, string>();
  const workbookRels = await readXml("xl/_rels/workbook.xml.rels");
  for (const relationship of workbookRels
    ? elements(workbookRels, "Relationship", PACKAGE_RELATIONSHIP_NS)
    : []) {
    const target = relationship.getAttribute("Target") ?? "";
    relationships.set(
      relationship.getAttribute("Id") ?? "",
      target.startsWith("/") ? target.slice(1) : `xl/${target}`,
    );
  }

  const sharedStringsXml = await readXml("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml ? elements(sharedStringsXml, "si").map(textOf) : [];

  const stylesXml = await readXml("xl/styles.xml");
  const customDateFormats = new Set(
    (stylesXml ? elements(stylesXml, "numFmt") : [])
      .filter((format) => isDateFormatCode(format.getAttribute("formatCode") ?? ""))
      .map((format) => Number(format.getAttribute("numFmtId"))),
  );
  const cellFormats = stylesXml ? elements(stylesXml, "cellXfs")[0] : undefined;
  const dateStyles = (cellFormats ? elements(cellFormats, "xf") : []).map((format) => {
    const id = Number(format.getAttribute("numFmtId") ?? "0");
    return BUILT_IN_DATE_FORMATS.has(id) || customDateFormats.has(id);
  });

  const sheets: Array<SpreadsheetSheet> = [];
  for (const sheet of elements(workbook, "sheet")) {
    const name = sheet.getAttribute("name") ?? `Sheet ${sheets.length + 1}`;
    const path = relationships.get(sheet.getAttributeNS(RELATIONSHIP_NS, "id") ?? "");
    const sheetXml = path === undefined ? null : await readXml(path);
    if (sheetXml === null) {
      sheets.push({ name, rows: [], truncated: false });
      continue;
    }
    const rows: Array<Array<string>> = [];
    let truncated = false;
    for (const [position, row] of elements(sheetXml, "row").entries()) {
      const rowIndex = Number(row.getAttribute("r") ?? position + 1) - 1;
      if (rowIndex >= MAX_SHEET_ROWS) {
        truncated = true;
        break;
      }
      const cells: Array<string> = [];
      for (const [cellPosition, cell] of elements(row, "c").entries()) {
        const reference = cell.getAttribute("r");
        const column = reference === null ? cellPosition : columnIndex(reference);
        if (column >= MAX_SHEET_COLUMNS) {
          truncated = true;
          continue;
        }
        const type = cell.getAttribute("t");
        const raw = elements(cell, "v")[0]?.textContent ?? "";
        const style = Number(cell.getAttribute("s") ?? "0");
        cells[column] =
          type === "s"
            ? (sharedStrings[Number(raw)] ?? "")
            : type === "inlineStr"
              ? textOf(cell)
              : type === "b"
                ? raw === "1"
                  ? "TRUE"
                  : "FALSE"
                : type === "str" || type === "e" || raw === ""
                  ? raw
                  : dateStyles[style] === true && Number.isFinite(Number(raw))
                    ? serialToIso(Number(raw))
                    : raw;
      }
      rows[rowIndex] = Array.from(cells, (value) => value ?? "");
    }
    // Array.from, not map: rows the sheet skips are holes that map would skip too.
    const width = Math.max(0, ...Array.from(rows, (row) => row?.length ?? 0));
    sheets.push({
      name,
      rows: Array.from(rows, (row) => {
        const filled = row ?? [];
        return [...filled, ...Array.from({ length: width - filled.length }, () => "")];
      }),
      truncated,
    });
  }
  return sheets;
}
