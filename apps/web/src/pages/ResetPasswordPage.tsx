import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
      });

      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setMessage(
        err.response?.data?.message || "Invalid or expired reset link"
      );
    }
  };

  if (!token) {
    return <h2 style={{ textAlign: "center" }}>Invalid reset link</h2>;
  }

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Reset Password</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <br /><br />
        <button type="submit">Reset Password</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default ResetPassword;