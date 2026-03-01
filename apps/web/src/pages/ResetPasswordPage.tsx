import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../layouts/AuthLayout";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });

      setMessage(res.data.message);
      setMessageType("success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setMessage(
        err.response?.data?.message || "Invalid or expired reset link"
      );
      setMessageType("error");
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <Stack spacing={4}>
          <Typography variant="h4" fontWeight={800} textAlign="center">
            Reset Password
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            The reset link is invalid or expired.
          </Typography>
          <Alert severity="error">Invalid reset link</Alert>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Stack spacing={4}>
        <Typography variant="h4" fontWeight={800} textAlign="center">
          Reset Password
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Create a new password for your account.
        </Typography>

        <Stack component="form" spacing={4} onSubmit={handleSubmit}>
          <TextField
            type="password"
            label="New Password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ borderRadius: "40px", textTransform: "none" }}
          >
            Reset Password
          </Button>
        </Stack>

        {message ? <Alert severity={messageType}>{message}</Alert> : null}
      </Stack>
    </AuthLayout>
  );
};

export default ResetPassword;
