const ACTIVE_PROJECT_KEY = "activeProjectId";

export const getActiveProjectId = () => localStorage.getItem(ACTIVE_PROJECT_KEY) || "";

export const setActiveProjectId = (projectId: string) => {
  if (!projectId) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
};
