import api from "./axios";

export type GlobalSearchResult = {
  entity: "BUG" | "TEST_CASE" | "TEST_RUN" | "TEST_SUITE";
  id: string;
  code?: string;
  title: string;
  subtitle?: string;
  route: string;
  updatedAt?: string;
};

export const globalSearch = async (q: string, limit = 10) => {
  const res = await api.get("/api/search/global", {
    params: { q, limit },
  });
  return res.data as {
    total: number;
    results: GlobalSearchResult[];
  };
};
