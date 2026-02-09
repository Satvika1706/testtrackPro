import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import VersionHistorySidebar from '../components/VersionHistorySidebar'; 

const EditTestCase = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State Management
  const [testCase, setTestCase] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<any[]>([]);
  const [changeSummary, setChangeSummary] = useState("");
  const [loading, setLoading] = useState(true);
  
  // History Sidebar State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

 
  const fetchTestCase = async () => {
    try {
      const res = await api.get(`/api/test-cases/${id}`);
      setTestCase(res.data);
      
      // Update form fields with latest data
      setTitle(res.data?.title ?? "");
      setDescription(res.data?.description ?? "");
      setSteps(res.data?.steps ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Failed to load test case");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Initial Load ---
  useEffect(() => {
    fetchTestCase();
  }, [id]);

  //  Step Logic 

  const addStep = () => {
    setSteps([...steps, { action: "", expectedResult: "" }]);
  };

  const deleteStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    setSteps(updatedSteps);
  };

  const handleStepChange = (index: number, field: string, value: string) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setSteps(updatedSteps);
  };

  // Save Logic 

  const handleSave = async () => {
    if (!changeSummary.trim()) {
      alert("Change summary is required");
      return;
    }

    try {
      
      await api.put(`/api/test-cases/${id}`, {
        ...testCase,
        title,
        description,
        steps, 
        changeSummary,
      });

      // 1. Show Success Message
      alert("Test case updated successfully");

      // 2. Clear the summary field
      setChangeSummary("");

      // 3. REFRESH DATA IMMEDIATELY (Fixes "No History Available")
      await fetchTestCase(); 

      // 4. STAY ON PAGE (Redirect removed)
      // navigate("/test-cases"); 

    } catch (err: any) {
      console.error("Update Error:", err);
      const errorMessage = err.response?.data?.message || "Update failed";
      alert(errorMessage);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Edit Test Case</h2>

      {/* Basic Info */}
      <section style={{ marginBottom: "20px" }}>
        <div>
          <label><strong>Title</strong></label><br />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <br />
        <div>
          <label><strong>Description</strong></label><br />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
      </section>

      <hr />

      {/* Step Management Section */}
      <section style={{ marginBottom: "20px" }}>
        <h3>Test Steps</h3>
        {steps.map((step, index) => (
          <div key={index} style={{ 
            marginBottom: "15px", 
            padding: "15px", 
            border: "1px solid #ddd", 
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
            position: "relative" 
          }}>
            <button 
              onClick={() => deleteStep(index)}
              style={{ 
                position: "absolute", 
                right: "10px", 
                top: "10px", 
                backgroundColor: "#ff4d4d", 
                color: "white", 
                border: "none", 
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Delete
            </button>

            <p style={{ margin: "0 0 10px 0" }}><strong>Step {index + 1}</strong></p>
            
            <label style={{ fontSize: "12px" }}>Action</label>
            <input 
              value={step.action} 
              onChange={(e) => handleStepChange(index, "action", e.target.value)}
              style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
              placeholder="e.g. Click the Login button"
            />

            <label style={{ fontSize: "12px" }}>Expected Result</label>
            <input 
              value={step.expectedResult} 
              onChange={(e) => handleStepChange(index, "expectedResult", e.target.value)}
              style={{ width: "100%", padding: "5px" }}
              placeholder="e.g. User should be redirected to dashboard"
            />
          </div>
        ))}

        <button 
          onClick={addStep}
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "#4CAF50", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: "pointer" 
          }}
        >
          + Add New Step
        </button>
      </section>

      <hr />

      {/* Change Summary & Actions */}
      <section>
        <div>
          <label><strong>Change Summary *</strong></label><br />
          <input
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder="Describe what you changed (required for version history)"
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
          />
        </div>
        <br />
        <div className="flex items-center gap-3 mt-6">
          <button 
            onClick={handleSave} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Changes
          </button>

          {/* History Button */}
          <button 
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="bg-gray-100Ql border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 flex items-center gap-2"
          >
            🕒 History
          </button>
        </div>

        {/* Sidebar Component */}
        <VersionHistorySidebar 
          testCaseId={id!} 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
        />
      </section>
    </div>
  );
};

export default EditTestCase;