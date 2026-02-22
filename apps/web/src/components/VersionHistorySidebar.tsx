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
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    />

    {/* Sidebar */}
    <div className="relative w-[420px] bg-white shadow-2xl h-full flex flex-col animate-slideInRight">

      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <h2 className="font-bold text-2xl tracking-wide">
          Version History
        </h2>
        <button
          onClick={onClose}
          className="text-2xl font-bold hover:scale-110 transition-transform duration-200"
        >
          ✕
        </button>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">

        {loading ? (
          <p className="text-center text-gray-500 text-lg animate-pulse">
            Loading history...
          </p>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-400 text-lg">
            No version history available.
          </p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedVersion(item)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 shadow-sm
                ${
                  selectedVersion?.id === item.id
                    ? "bg-indigo-100 border-indigo-500 shadow-md scale-[1.02]"
                    : "bg-white hover:shadow-lg hover:scale-[1.01]"
                }
              `}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-lg font-semibold text-gray-800">
                    Version {item.version}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    Changed by:{" "}
                    <span className="font-medium text-gray-700">
                      {item.changedBy ?? "System"}
                    </span>
                  </p>
                </div>

                <span className="text-sm text-gray-400">
                  {new Date(item.changedAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

     {/* Snapshot Preview */}
{selectedVersion && (
  <div className="border-t bg-white p-6 overflow-auto max-h-80">

    <div className="text-xl font-bold text-gray-800 mb-4">
      Version {selectedVersion.version} Details
    </div>

    {Array.isArray(selectedVersion.stepsSnapshot) ? (
      <div className="space-y-4">
        {selectedVersion.stepsSnapshot.map((step: any, index: number) => (
          <div
            key={step.id || index}
            className="p-4 rounded-xl border bg-gray-50 shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold text-indigo-600">
                Step {step.stepNumber ?? index + 1}
              </span>

              {step.action && (
                <span className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  {step.action}
                </span>
              )}
            </div>

            {step.expectedResult && (
              <p className="text-gray-700 text-base">
                <span className="font-semibold">Expected Result:</span>{" "}
                {step.expectedResult}
              </p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="p-4 rounded-xl border bg-gray-50 shadow-sm text-gray-700 text-base">
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
)}
</div>

    {/* Animation */}
    <style>
      {`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}
    </style>
  </div>
);
};

export default VersionHistorySidebar;