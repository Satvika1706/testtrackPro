import { useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../utils/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      const user = getCurrentUser();
      window.location.href =
        user?.role === "DEVELOPER" ? "/developer/dashboard" : "/test-cases";
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--primary-color)' }}>
          LOGIN
        </h2>

        <div className="form-group">
          <label>Email</label>
          <input
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p>
  <a href="/forgot-password">Forgot Password?</a>
</p>
        </div>

        <button onClick={handleLogin} className="w-full mb-4">
          Sign In
        </button>

        {error && (
          <div style={{ color: "red", textAlign: "center", marginBottom: "12px" }}>
            {error}
          </div>
        )}

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
