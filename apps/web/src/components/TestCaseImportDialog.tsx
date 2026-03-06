import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import * as XLSX from "xlsx";
import {
  commitTestCaseImport,
  getTestCaseImportMeta,
  previewTestCaseImport,
  type TestCaseImportMapping,
  type TestCaseImportPreviewResponse,
  type TestCaseImportRow,
} from "../api/testcases.api";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const defaultFields = [
  "title",
  "description",
  "module",
  "priority",
  "severity",
  "type",
  "status",
  "preConditions",
  "testData",
  "environment",
  "steps",
  "stepAction",
  "stepExpectedResult",
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const detectField = (header: string) => {
  const key = normalize(header);
  if (["title", "testcasetitle", "name"].includes(key)) return "title";
  if (["description", "desc", "summary"].includes(key)) return "description";
  if (["module", "feature", "component", "area"].includes(key)) return "module";
  if (["priority"].includes(key)) return "priority";
  if (["severity"].includes(key)) return "severity";
  if (["type", "testtype"].includes(key)) return "type";
  if (["status", "teststatus"].includes(key)) return "status";
  if (["preconditions", "precondition", "preconditionss"].includes(key)) return "preConditions";
  if (["testdata", "data"].includes(key)) return "testData";
  if (["environment", "env"].includes(key)) return "environment";
  if (["steps", "teststeps"].includes(key)) return "steps";
  if (["stepaction", "action"].includes(key)) return "stepAction";
  if (["stepexpectedresult", "expectedresult", "expected"].includes(key)) return "stepExpectedResult";
  return "";
};

const parseSheetRows = (buffer: ArrayBuffer): TestCaseImportRow[] => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false }) as TestCaseImportRow[];
};

const TestCaseImportDialog = ({ open, onClose, onImported }: Props) => {
  const [targetFields, setTargetFields] = useState<string[]>(defaultFields);
  const [rawRows, setRawRows] = useState<TestCaseImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<TestCaseImportMapping>({});
  const [preview, setPreview] = useState<TestCaseImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"skip_errors" | "all_or_nothing">("skip_errors");

  useEffect(() => {
    if (!open) return;
    getTestCaseImportMeta()
      .then((meta) => {
        if (Array.isArray(meta.targetFields) && meta.targetFields.length) {
          setTargetFields(meta.targetFields);
        }
      })
      .catch(() => {
        setTargetFields(defaultFields);
      });
  }, [open]);

  const resetState = () => {
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    setError("");
    setFileName("");
    setMode("skip_errors");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFilePick = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: TestCaseImportRow[] = [];

      if (ext === "json") {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON import must be an array of test case objects.");
        }
        rows = parsed as TestCaseImportRow[];
      } else if (["csv", "xlsx", "xls"].includes(ext || "")) {
        const buffer = await file.arrayBuffer();
        rows = parseSheetRows(buffer);
      } else {
        throw new Error("Supported formats are CSV, XLSX, XLS, JSON.");
      }

      if (!rows.length) {
        throw new Error("No rows found in the uploaded file.");
      }

      const firstRow = rows[0] || {};
      const rowHeaders = Object.keys(firstRow);
      if (!rowHeaders.length) {
        throw new Error("No columns found in uploaded file.");
      }

      const suggested: TestCaseImportMapping = {};
      rowHeaders.forEach((header) => {
        const field = detectField(header);
        if (field) suggested[field] = header;
      });

      setFileName(file.name);
      setRawRows(rows);
      setHeaders(rowHeaders);
      setMapping(suggested);
    } catch (e: any) {
      setError(e?.message || "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  const previewRows = async () => {
    if (!rawRows.length) return;
    setLoading(true);
    setError("");
    try {
      const data = await previewTestCaseImport(rawRows, mapping);
      setPreview(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  const importRows = async () => {
    if (!rawRows.length) return;
    setLoading(true);
    setError("");
    try {
      const result = await commitTestCaseImport(rawRows, mapping, mode);
      setPreview(result);
      if (result.importedCount > 0) {
        onImported();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const previewSample = useMemo(() => (preview?.rows || []).slice(0, 10), [preview]);
  const errorRows = useMemo(
    () => (preview?.rows || []).filter((row) => row.errors.length > 0).slice(0, 10),
    [preview]
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>Import Test Cases (CSV/Excel/JSON)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Example: upload an Excel file with 50 rows, map file columns to test case fields, preview results, and confirm import.
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <Button variant="outlined" component="label" disabled={loading}>
              Upload File
              <input
                type="file"
                hidden
                accept=".csv,.xlsx,.xls,.json"
                onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {fileName || "No file selected"}
            </Typography>
          </Stack>

          {!!headers.length && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Field Mapping
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                {targetFields.map((field) => (
                  <FormControl size="small" key={field}>
                    <InputLabel>{field}</InputLabel>
                    <Select
                      value={mapping[field] || ""}
                      label={field}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="">Not mapped</MenuItem>
                      {headers.map((header) => (
                        <MenuItem key={header} value={header}>
                          {header}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Box>
            </Paper>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Import Mode</InputLabel>
              <Select
                value={mode}
                label="Import Mode"
                onChange={(e) => setMode(e.target.value as "skip_errors" | "all_or_nothing")}
              >
                <MenuItem value="skip_errors">Import valid rows only</MenuItem>
                <MenuItem value="all_or_nothing">Fail import if any row invalid</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={previewRows} disabled={loading || !rawRows.length}>
              Preview Import
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={importRows}
              disabled={loading || !preview || preview.validRows === 0}
            >
              Confirm Import
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {preview ? (
            <Alert severity={preview.invalidRows ? "warning" : "success"}>
              Total: {preview.totalRows} | Valid: {preview.validRows} | Invalid: {preview.invalidRows}
              {"importedCount" in preview ? ` | Imported: ${preview.importedCount}` : ""}
            </Alert>
          ) : null}

          {previewSample.length ? (
            <Paper variant="outlined" sx={{ maxHeight: 260, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Module</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Steps</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewSample.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>{row.data.title}</TableCell>
                      <TableCell>{row.data.module}</TableCell>
                      <TableCell>{row.data.priority}</TableCell>
                      <TableCell>{row.data.status}</TableCell>
                      <TableCell>{row.data.steps.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : null}

          {errorRows.length ? (
            <Paper variant="outlined" sx={{ maxHeight: 220, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Errors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errorRows.map((row) => (
                    <TableRow key={`err-${row.rowNumber}`}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>{row.errors.join(" ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestCaseImportDialog;
