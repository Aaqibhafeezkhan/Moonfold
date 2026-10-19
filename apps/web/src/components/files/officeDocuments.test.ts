// @vitest-environment jsdom

import JSZip from "jszip";
import { describe, expect, it } from "vite-plus/test";

import { docxToHtml } from "./docxPreview";
import { MAX_SHEET_ROWS, readXlsxWorkbook } from "./officeDocuments";

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";

async function workbook(sheets: ReadonlyArray<{ name: string; rows: string }>) {
  const zip = new JSZip();
  zip.file(
    "xl/workbook.xml",
    `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${sheet.name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join("")}</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<Relationships xmlns="${PKG}">${sheets
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Target="worksheets/sheet${index + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
  );
  zip.file(
    "xl/sharedStrings.xml",
    `<sst xmlns="${MAIN}"><si><t>Name</t></si><si><r><t>Ama</t></r><r><t>ra</t></r></si></sst>`,
  );
  // Style 1 shows a built-in date format; style 2 a custom date format.
  zip.file(
    "xl/styles.xml",
    `<styleSheet xmlns="${MAIN}"><numFmts><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>`,
  );
  sheets.forEach((sheet, index) =>
    zip.file(
      `xl/worksheets/sheet${index + 1}.xml`,
      `<worksheet xmlns="${MAIN}"><sheetData>${sheet.rows}</sheetData></worksheet>`,
    ),
  );
  return zip.generateAsync({ type: "uint8array" });
}

describe("readXlsxWorkbook", () => {
  it("reads strings, numbers, booleans and dates on every sheet", async () => {
    const data = await workbook([
      {
        name: "People",
        rows:
          `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Joined</t></is></c></row>` +
          `<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>42.5</v></c><c r="C2" s="1"><v>45580</v></c><c r="D2" t="b"><v>1</v></c></row>` +
          `<row r="4"><c r="C4" s="2"><v>45580.5</v></c></row>`,
      },
      { name: "Empty", rows: "" },
    ]);
    const sheets = await readXlsxWorkbook(data);
    expect(sheets.map((sheet) => sheet.name)).toEqual(["People", "Empty"]);
    expect(sheets[0]?.rows).toEqual([
      ["Name", "", "Joined", ""],
      ["Amara", "42.5", "2024-10-15", "TRUE"],
      ["", "", "", ""],
      ["", "", "2024-10-15 12:00:00", ""],
    ]);
    expect(sheets[0]?.truncated).toBe(false);
    expect(sheets[1]?.rows).toEqual([]);
  });

  it("stops at the row limit and says so", async () => {
    const rows = Array.from(
      { length: MAX_SHEET_ROWS + 5 },
      (_, index) => `<row r="${index + 1}"><c r="A${index + 1}"><v>${index}</v></c></row>`,
    ).join("");
    const [sheet] = await readXlsxWorkbook(await workbook([{ name: "Long", rows }]));
    expect(sheet?.rows).toHaveLength(MAX_SHEET_ROWS);
    expect(sheet?.truncated).toBe(true);
  });

  it("rejects a file that is not a workbook", async () => {
    const zip = new JSZip();
    zip.file("hello.txt", "hi");
    await expect(readXlsxWorkbook(await zip.generateAsync({ type: "uint8array" }))).rejects.toThrow(
      "not an Excel workbook",
    );
  });
});

describe("docxToHtml", () => {
  it("keeps the document's content and makes links open outside the app", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    );
    zip.file(
      "word/_rels/document.xml.rels",
      `<Relationships xmlns="${PKG}"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/spec" TargetMode="External"/></Relationships>`,
    );
    zip.file(
      "word/document.xml",
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${REL}"><w:body>` +
        `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Release notes</w:t></w:r></w:p>` +
        `<w:p><w:hyperlink r:id="rId9"><w:r><w:t>Read the spec</w:t></w:r></w:hyperlink></w:p>` +
        `<w:p><w:r><w:t>&lt;script&gt;alert(1)&lt;/script&gt;</w:t></w:r></w:p>` +
        `</w:body></w:document>`,
    );
    const html = await docxToHtml(await zip.generateAsync({ type: "arraybuffer" }));
    expect(html).toContain("<strong>Release notes</strong>");
    expect(html).toContain(
      '<a href="https://example.com/spec" target="_blank" rel="noopener noreferrer">Read the spec</a>',
    );
    // Text that looks like markup stays text.
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script");
  });
});
