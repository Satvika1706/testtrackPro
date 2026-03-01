import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import api from "../api/axios";

import {
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  Stack,
  CircularProgress,
  Link,
} from "@mui/material";

import AuthLayout from "../layouts/AuthLayout";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TESTER");

  const [successMessage, setSuccessMessage] = useState("");
  const [verificationLink, setVerificationLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setSuccessMessage("");
    setVerificationLink("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        role,
      });

      setSuccessMessage(
        res.data?.message ??
          "Account created successfully. Please verify your email."
      );

      if (res.data?.verificationUrl) {
        setVerificationLink(res.data.verificationUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Typography
        variant="h4"
        fontWeight={800}
        textAlign="center"
        gutterBottom
      >
        Welcome to TestTrack Pro
      </Typography>

      <Typography
        variant="body1"
        textAlign="center"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Please register below to start managing your test cases efficiently.
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={4}>
        <TextField
          label="Email"
          placeholder="name@example.com"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Password"
          type="password"
          placeholder="Enter your password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <TextField
          select
          label="Register As"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          fullWidth
        >
          <MenuItem value="TESTER">Tester</MenuItem>
          <MenuItem value="DEVELOPER">Developer</MenuItem>
          <MenuItem value="TRIAGE">Triage</MenuItem>
          <MenuItem value="ADMIN">Admin</MenuItem>
        </TextField>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          onClick={handleRegister}
          sx={{
            py: 1.8,
            borderRadius: "40px",
            fontWeight: 700,
            fontSize: "1.05rem",
            textTransform: "none",
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Create Account"
          )}
        </Button>

        {verificationLink && (
          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: "40px", textTransform: "none" }}
            onClick={() => window.open(verificationLink, "_blank")}
          >
            Verify Email
          </Button>
        )}

        <Typography variant="body1" textAlign="center">
          Already have an account?{" "}
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            Login here
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Register;
