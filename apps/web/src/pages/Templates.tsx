import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { getTestCaseTemplates } from "../api/testcases.api";

const Templates = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getTestCaseTemplates().then(setTemplates);
  }, []);

  return (
    <Box>
      <Stack spacing={0.75} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          Test Case Templates
        </Typography>
        <Typography color="text.secondary">
          Use saved templates to quickly create test cases.
        </Typography>
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        {templates.length === 0 ? (
          <Typography color="text.secondary">No templates available.</Typography>
        ) : (
          <Stack spacing={2}>
            {templates.map((t) => (
              <Paper
                key={t.id}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography fontWeight={700}>{t.name}</Typography>
                  <Typography color="text.secondary">{t.category}</Typography>
                </Box>

                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate(`/test-cases/new?templateId=${t.id}`)}
                >
                  Use Template
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default Templates;
