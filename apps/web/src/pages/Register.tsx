import { useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TESTER");
  const [verificationLink, setVerificationLink] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    setSuccessMessage("");
    setVerificationLink("");

    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        role,
      });

      setSuccessMessage(res.data?.message ?? "Registration successful.");
      const link = res.data?.verificationUrl;
      if (typeof link === "string" && link.length > 0) {
        setVerificationLink(link);
      }

    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h2 className="text-2xl font-bold text-center mb-6"
          style={{ color: "var(--primary-color)" }}>
          Welcome to TestTrack Pro! Please Register to get started.
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
            placeholder="Enter strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label>Register As</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="TESTER">Tester</option>
            <option value="DEVELOPER">Developer</option>
            <option value="TRIAGE">Triage</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <br />

        <button onClick={handleRegister} className="w-full mb-4">
          Register
        </button>

        {error && (
          <div style={{ color: "red", textAlign: "center" }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ color: "green", textAlign: "center", marginTop: "8px" }}>
            {successMessage}
          </div>
        )}

        {verificationLink && (
          <div style={{ marginTop: "15px", textAlign: "center" }}>
            <p style={{ color: "green" }}>
              Development link:
            </p>
            <a href={verificationLink} style={{ color: "blue" }}>
              Verify Email
            </a>
          </div>
        )}

        <p className="text-center text-sm"
           style={{ color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
