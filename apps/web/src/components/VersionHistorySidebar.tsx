import React, { useEffect, useState } from "react";
import api from "../api/axios"; // ✅ correct import

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
    const res = await api.get(
      `/api/test-cases/${testCaseId}/history`
    );

    console.log("HISTORY RESPONSE:", res.data);
    setHistory(res.data);
  } catch (err) {
    console.error("Failed to load history", err);
  } finally {
    setLoading(false);
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={onClose}
      />

      <div className="relative w-96 bg-white shadow-xl h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">Version History</h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-gray-500 hover:text-red-600"
          >
            ×
          </button>
        </div>

        {/* Versions */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-gray-400">
              Loading history...
            </p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-400">
              No history available yet.
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedVersion(item)}
                className={`p-3 mb-3 border rounded cursor-pointer ${
                  selectedVersion?.id === item.id
                    ? "bg-blue-50 border-blue-400"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">
                    Version {item.version} <br></br>
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.changedAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Changed by User ID: {item.changedBy ?? "System"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Snapshot */}
        {selectedVersion && (
          <div className="border-t p-3 bg-gray-900 text-green-400 text-xs overflow-auto">
            <pre>
              {JSON.stringify(
                selectedVersion.stepsSnapshot,
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistorySidebar;
