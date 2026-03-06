import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import api from "../api/axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import Logo from "../assets/logo.png";

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  form?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("TESTER");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationLink, setVerificationLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const fieldSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        backgroundColor: "#ffffff",
        minHeight: 50,
        transition: "all 150ms ease",
      },
      "& .MuiOutlinedInput-root.Mui-focused": {
        boxShadow: "0 0 0 3px rgba(37,99,235,0.2)",
      },
    }),
    []
  );

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!username.trim()) errors.username = "Username is required";
    else if (username.length < 3)
      errors.username = "Minimum 3 characters required";

    if (!email.trim()) errors.email = "Email is required";
    else if (!EMAIL_REGEX.test(email))
      errors.email = "Enter a valid email";

    if (!password) errors.password = "Password is required";
    else if (password.length < 8)
      errors.password = "Minimum 8 characters required";

    if (!confirmPassword)
      errors.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    return errors;
  };

  const handleRegister = async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setVerificationLink("");

    try {
      const res = await api.post("/auth/register", {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      setSuccessMessage(
        res.data?.message ??
          "Account created successfully. Please verify your email."
      );
      setSuccessOpen(true);

      if (res.data?.verificationUrl) {
        setVerificationLink(res.data.verificationUrl);
      }

      setFieldErrors({});
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Registration failed";

      if (/username/i.test(message))
        setFieldErrors({ username: message });
      else if (/email/i.test(message))
        setFieldErrors({ email: message });
      else setFieldErrors({ form: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex" }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "center",
          px: 8,
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        }}
      >
        <Box sx={{ textAlign: "center", maxWidth: 520 }}>
          <Box
            component="img"
            src={Logo}
            alt="TestTrack Pro"
            sx={{
              width: 360,
              maxWidth: "100%",
              mb: 4,
              filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.35))",
              transition: "transform 300ms ease",
              "&:hover": { transform: "scale(1.04)" },
            }}
          />
          <Typography
            sx={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            Software Testing • Role Management • Workflow Automation
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          backgroundColor: "#f8fafc",
        }}
      >
        <Paper
          sx={{
            width: "100%",
            maxWidth: 500,
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            boxShadow: "0 30px 60px rgba(15,23,42,0.15)",
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.8rem", sm: "2.1rem" },
                  letterSpacing: -0.6,
                }}
              >
                Create account
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "#64748b", mt: 1.5 }}
              >
                Start managing your QA workflow today.
              </Typography>
            </Box>

            {fieldErrors.form && (
              <Alert severity="error">{fieldErrors.form}</Alert>
            )}

            <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} error={!!fieldErrors.username} helperText={fieldErrors.username} sx={fieldSx} fullWidth />
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={!!fieldErrors.email} helperText={fieldErrors.email} sx={fieldSx} fullWidth />

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              sx={fieldSx}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)}>
                      
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
              sx={fieldSx}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)}>
                     
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField select label="Register as" value={role} onChange={(e) => setRole(e.target.value)} fullWidth sx={fieldSx}>
              <MenuItem value="TESTER">Tester</MenuItem>
              <MenuItem value="DEVELOPER">Developer</MenuItem>
              <MenuItem value="TRIAGE">Triage</MenuItem>
            </TextField>

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              onClick={handleRegister}
              sx={{
                py: 1.4,
                fontWeight: 800,
                fontSize: "0.9rem",
                letterSpacing: 0.8,
                borderRadius: 2.5,
                backgroundColor: "#2563eb",
                boxShadow: "0 12px 30px rgba(37,99,235,0.45)",
                "&:hover": {
                  backgroundColor: "#1d4ed8",
                  boxShadow: "0 16px 40px rgba(37,99,235,0.6)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "CREATE ACCOUNT"}
            </Button>

            {verificationLink && (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => window.open(verificationLink, "_blank")}
                sx={{ fontWeight: 600 }}
              >
                Verify Email
              </Button>
            )}

            <Typography variant="body2" textAlign="center" sx={{ color: "#64748b" }}>
              Already have an account?{" "}
              <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 600 }}>
                Login
              </Link>
            </Typography>
          </Stack>
        </Paper>
      </Box>

      <Snackbar open={successOpen} autoHideDuration={5000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Register;
