import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import api from "../api/axios";

import {
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  CircularProgress,
  Link,
} from "@mui/material";

import AuthLayout from "../layouts/AuthLayout";
import { setAuthTokens } from "../utils/auth";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      setAuthTokens(res.data.token, res.data.refreshToken);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
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
        Welcome Back
      </Typography>

      <Typography
        variant="body1"
        textAlign="center"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Sign in to continue to TestTrack Pro.
      </Typography>

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
          placeholder="******"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Link
          component={RouterLink}
          to="/forgot-password"
          underline="hover"
          sx={{
            alignSelf: "flex-end",
            fontSize: "0.9rem",
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          Forgot Password?
        </Link>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          onClick={handleLogin}
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
            "Sign In"
          )}
        </Button>

        <Typography variant="body1" textAlign="center">
          Don’t have an account?{" "}
          <Link
            component={RouterLink}
            to="/register"
            underline="hover"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            Register here
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Login;
