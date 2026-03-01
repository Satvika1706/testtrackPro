import { useEffect, useRef, useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../layouts/AuthLayout";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your email...");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const hasRequestedRef = useRef(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;

    if (!token) {
      setMessage("Invalid verification link.");
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setMessage("Email verified successfully! Redirecting to login...");
        setStatus("success");

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } catch (error: any) {
        setMessage(error.response?.data?.message || "Verification failed.");
        setStatus("error");
      }
    };

    void verify();
  }, [token, navigate]);

  return (
    <AuthLayout>
      <Stack spacing={4}>
        <Typography variant="h4" fontWeight={800} textAlign="center">
          Verify Email
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          We are verifying your email address.
        </Typography>

        <Alert severity={status === "error" ? "error" : status === "success" ? "success" : "info"}>
          {message}
        </Alert>

        {status === "error" ? (
          <Button
            variant="contained"
            fullWidth
            size="large"
            sx={{ borderRadius: "40px", textTransform: "none" }}
            onClick={() => navigate("/register")}
          >
            Go to Register
          </Button>
        ) : null}
      </Stack>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
