import { useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TESTER");

  const handleRegister = async () => {
    try {
      await api.post("/auth/register", {
        email,
        password,
        role
      });

      alert("Registration successful. Please login.");
      window.location.href = "/login";
    } catch (err: any) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h2 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--primary-color)' }}>
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
            placeholder="Start typing..."
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
<br></br>
<br></br>
        <button onClick={handleRegister} className="w-full mb-4">
          Register
        </button>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
