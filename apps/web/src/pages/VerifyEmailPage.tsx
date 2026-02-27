import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

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
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>{message}</h2>
      {status === "error" && (
        <button style={{ marginTop: "16px" }} onClick={() => navigate("/register")}>
          Go to Register
        </button>
      )}
    </div>
  );
};

export default VerifyEmailPage;
