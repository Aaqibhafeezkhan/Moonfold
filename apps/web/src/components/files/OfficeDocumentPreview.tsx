import { useEffect, useState } from "react";

import { Spinner } from "~/components/ui/spinner";
import { Toggle, ToggleGroup } from "~/components/ui/toggle-group";

import { PreviewTable } from "./DelimitedTablePreview";
import { docxToHtml } from "./docxPreview";
import {
  MAX_SHEET_COLUMNS,
  MAX_SHEET_ROWS,
  readXlsxWorkbook,
  type SpreadsheetSheet,
} from "./officeDocuments";

type Loaded =
  | { readonly kind: "docx"; readonly html: string }
  | { readonly kind: "xlsx"; readonly sheets: ReadonlyArray<SpreadsheetSheet> };

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready"; readonly document: Loaded };

/**
 * A Word document or Excel workbook rendered from its signed URL. The file is read in the
 * browser; nothing is converted on the environment's machine.
 */
export function OfficeDocumentPreview(props: {
  readonly src: string | null;
  readonly sourceFailed: boolean;
  readonly kind: "docx" | "xlsx";
  readonly name: string;
}) {
  const { src, kind } = props;
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (src === null) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    void (async () => {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) throw new Error(`The file could not be read (${response.status}).`);
        const data = await response.arrayBuffer();
        const document: Loaded =
          kind === "docx"
            ? { kind, html: await docxToHtml(data) }
            : { kind, sheets: await readXlsxWorkbook(data) };
        if (!controller.signal.aborted) setState({ status: "ready", document });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "failed",
          message:
            error instanceof Error && error.message.length > 0
              ? error.message
              : "The file could not be shown.",
        });
      }
    })();
    return () => controller.abort();
  }, [src, kind]);

  if (props.sourceFailed || state.status === "failed") {
    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-destructive-foreground"
      >
        {state.status === "failed" ? state.message : "Unable to load file preview."}
      </div>
    );
  }
  if (src === null || state.status === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <Spinner size="lg" />
      </div>
    );
  }
  return state.document.kind === "docx" ? (
    <div className="scrollbar-gutter-both min-h-0 flex-1 overflow-auto">
      <div
        className="chat-markdown mx-auto max-w-4xl px-6 py-5"
        // Sanitized in docxToHtml: no scripts, styles or remote images.
        dangerouslySetInnerHTML={{ __html: state.document.html }}
      />
    </div>
  ) : (
    <SpreadsheetPreview name={props.name} sheets={state.document.sheets} />
  );
}

function SpreadsheetPreview(props: {
  readonly name: string;
  readonly sheets: ReadonlyArray<SpreadsheetSheet>;
}) {
  const [selected, setSelected] = useState(0);
  const sheet = props.sheets[selected] ?? props.sheets[0];
  if (sheet === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted-foreground">
        This workbook has no sheets.
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {props.sheets.length > 1 ? (
        <div className="shrink-0 overflow-x-auto border-b border-border px-3 py-1.5">
          <ToggleGroup
            aria-label="Sheet"
            value={[String(selected)]}
            onValueChange={(values) => {
              const next = Number(values[0]);
              if (Number.isInteger(next)) setSelected(next);
            }}
          >
            {props.sheets.map((entry, index) => (
              <Toggle key={`${index}:${entry.name}`} value={String(index)}>
                {entry.name}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>
      ) : null}
      {sheet.rows.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted-foreground">
          This sheet is empty.
        </div>
      ) : (
        <PreviewTable
          key={selected}
          name={`${props.name}: ${sheet.name}`}
          rows={sheet.rows}
          notice={
            sheet.truncated
              ? `Sheet limited to the first ${MAX_SHEET_ROWS} rows and ${MAX_SHEET_COLUMNS} columns.`
              : null
          }
        />
      )}
    </div>
  );
}
