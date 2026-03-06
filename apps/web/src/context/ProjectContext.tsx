import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProjects, type Project } from "../api/projects.api";
import { getActiveProjectId, setActiveProjectId as persistActiveProjectId } from "../utils/project";

type ProjectContextValue = {
  projects: Project[];
  activeProjectId: string;
  activeProject: Project | null;
  loading: boolean;
  loadError: boolean;
  refreshProjects: () => Promise<void>;
  setActiveProjectId: (projectId: string) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string>(getActiveProjectId());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const refreshProjects = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await getProjects();
      setProjects(rows);
      if (!rows.length) {
        setActiveProjectIdState((prev) => prev);
        return;
      }
      const existing = getActiveProjectId();
      const selected = rows.some((row) => row.id === existing) ? existing : rows[0].id;
      setActiveProjectIdState(selected);
      persistActiveProjectId(selected);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProjects();
  }, []);

  const setActiveProjectId = (projectId: string) => {
    setActiveProjectIdState(projectId);
    persistActiveProjectId(projectId);
  };

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProjectId,
      activeProject: projects.find((project) => project.id === activeProjectId) || null,
      loading,
      loadError,
      refreshProjects,
      setActiveProjectId,
    }),
    [projects, activeProjectId, loading, loadError]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return ctx;
};
