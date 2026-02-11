import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTestCaseTemplates } from "../api/testcases.api";
import Button from "@mui/material/Button";

const Templates = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getTestCaseTemplates().then(setTemplates);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Test Case Templates</h2>

      <ul>
        {templates.map((t) => (
          <li key={t.id} style={{ marginBottom: 10 }}>
            <strong>{t.name}</strong> — {t.category}

            <Button
              variant="contained"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={() =>
                navigate(`/test-cases/new?templateId=${t.id}`)
              }
            >
              Use Template
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Templates;
