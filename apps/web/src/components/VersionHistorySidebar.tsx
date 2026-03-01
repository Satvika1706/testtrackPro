import React, { useEffect, useState } from "react";
import api from "../api/axios";

interface HistoryItem {
  id: string;
  version: number;
  changedAt: string;
  changedBy: number | null;
  stepsSnapshot: any;
}

interface Props {
  testCaseId: string;
  isOpen: boolean;
  onClose: () => void;
}

const VersionHistorySidebar: React.FC<Props> = ({
  testCaseId,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] =
    useState<HistoryItem | null>(null);

  useEffect(() => {
    if (isOpen && testCaseId) {
      fetchHistory();
      setSelectedVersion(null);
    }
  }, [isOpen, testCaseId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/test-cases/${testCaseId}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="version-overlay">
      <div className="version-overlay-backdrop" onClick={onClose} />

      <div className="version-sidebar">
        <div className="version-header">
          <h2 className="font-bold text-2xl">Version History</h2>
          <button
            type="button"
            onClick={onClose}
            className="version-close"
            aria-label="Close version history"
          >
            X
          </button>
        </div>

        <div className="version-list">
          {loading ? (
            <p className="text-center text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-400">No version history available.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedVersion(item)}
                className={`version-item ${selectedVersion?.id === item.id ? "active" : ""}`}
              >
                <div className="version-meta">
                  <div>
                    <span className="text-lg font-semibold text-gray-800">
                      Version {item.version}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Changed by: <span className="font-medium text-gray-700">{item.changedBy ?? "System"}</span>
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">{new Date(item.changedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedVersion ? (
          <div className="version-detail">
            <div className="text-xl font-bold text-gray-800 mb-4">
              Version {selectedVersion.version} Details
            </div>

            {Array.isArray(selectedVersion.stepsSnapshot) ? (
              <div>
                {selectedVersion.stepsSnapshot.map((step: any, index: number) => (
                  <div key={step.id || index} className="version-step">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-semibold text-indigo-600">
                        Step {step.stepNumber ?? index + 1}
                      </span>

                      {step.action ? (
                        <span className="badge info">{step.action}</span>
                      ) : null}
                    </div>

                    {step.expectedResult ? (
                      <p className="text-gray-700 text-base">
                        <span className="font-semibold">Expected Result:</span>{" "}
                        {step.expectedResult}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="version-step">
                {Object.entries(selectedVersion.stepsSnapshot || {}).map(
                  ([key, value]: any) => (
                    <p key={key} className="mb-2">
                      <span className="font-semibold capitalize">
                        {key.replace(/([A-Z])/g, " $1")}:
                      </span>{" "}
                      {String(value)}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VersionHistorySidebar;
