import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { globalSearch, type GlobalSearchResult } from "../api/search.api";

const entities: GlobalSearchResult["entity"][] = [
  "BUG",
  "TEST_CASE",
  "TEST_RUN",
  "TEST_SUITE",
];

const GlobalSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [selectedEntities, setSelectedEntities] =
    useState<GlobalSearchResult["entity"][]>(entities);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await globalSearch(trimmed, 20);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to run global search");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    setQ(currentQ);
    void load(currentQ);
  }, [searchParams]);

  const filtered = useMemo(
    () => results.filter((item) => selectedEntities.includes(item.entity)),
    [results, selectedEntities]
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          Global Search
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search bugs, test cases, test runs, suites..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearchParams(q.trim() ? { q: q.trim() } : {});
            }
          }}
        />
        <Button
          variant="contained"
          onClick={() => setSearchParams(q.trim() ? { q: q.trim() } : {})}
        >
          Search
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
        {entities.map((entity) => {
          const selected = selectedEntities.includes(entity);
          return (
            <Chip
              key={entity}
              label={entity}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() =>
                setSelectedEntities((prev) =>
                  prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
                )
              }
            />
          );
        })}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Searching...</Typography>
        </Box>
      ) : null}

      {!loading && q.trim() && filtered.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">No results found for "{q}".</Typography>
        </Paper>
      ) : null}

      <Stack spacing={1.5}>
        {filtered.map((item) => (
          <Paper
            key={`${item.entity}-${item.id}`}
            sx={{ p: 2, borderRadius: 2.5, cursor: "pointer" }}
            onClick={() => navigate(item.route)}
          >
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip label={item.entity} size="small" variant="outlined" />
                  {item.code ? <Typography variant="caption">{item.code}</Typography> : null}
                </Stack>
                <Typography fontWeight={700}>{item.title}</Typography>
                {item.subtitle ? (
                  <Typography variant="body2" color="text.secondary">
                    {item.subtitle}
                  </Typography>
                ) : null}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ""}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default GlobalSearchPage;
