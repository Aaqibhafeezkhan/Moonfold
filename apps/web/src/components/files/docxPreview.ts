import DOMPurify from "dompurify";

let purifier: ReturnType<typeof DOMPurify> | null = null;

// A document can come from anywhere, so the preview keeps only its content: no scripts, no
// remote images (which would report that the file was opened), and links that open outside
// the app.
function sanitizeDocumentHtml(html: string): string {
  if (!purifier) {
    purifier = DOMPurify(window);
    purifier.addHook("uponSanitizeAttribute", (node, data) => {
      if (
        node.nodeName === "IMG" &&
        data.attrName === "src" &&
        !data.attrValue.startsWith("data:")
      ) {
        data.keepAttr = false;
      }
    });
    purifier.addHook("afterSanitizeAttributes", (node) => {
      if (node.nodeName === "A" && node.getAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }
  return purifier.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ["style"] });
}

/** A .docx file as safe HTML: headings, paragraphs, lists, tables, links and embedded images. */
export async function docxToHtml(data: ArrayBuffer): Promise<string> {
  // Loaded on first use: most sessions never open a Word document.
  const mammoth = await import("mammoth");
  // The browser build reads `arrayBuffer`, the Node build (tests) `buffer`; JSZip takes either.
  const result = await mammoth.convertToHtml({ arrayBuffer: data, buffer: data } as {
    arrayBuffer: ArrayBuffer;
  });
  return sanitizeDocumentHtml(result.value);
}
