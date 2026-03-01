import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import api from "../api/axios";
import AuthLayout from "../layouts/AuthLayout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
      setMessageType("success");
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Something went wrong");
      setMessageType("error");
    }
  };

  return (
    <AuthLayout>
      <Stack spacing={4}>
        <Typography variant="h4" fontWeight={800} textAlign="center">
          Forgot Password
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Enter your account email and we&apos;ll send a reset link.
        </Typography>

        <Stack component="form" spacing={4} onSubmit={handleSubmit}>
          <TextField
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            Send Reset Link
          </Button>
        </Stack>

        {message ? <Alert severity={messageType}>{message}</Alert> : null}
      </Stack>
    </AuthLayout>
  );
};

export default ForgotPassword;
