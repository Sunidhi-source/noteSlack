"use client";

import { useState, useCallback, useRef } from "react";
import { SearchResults } from "@/types";

const EMPTY: SearchResults = { messages: [], documents: [], channels: [] };

export function useSearch(workspaceId: string) {
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(
    (query: string) => {
      clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setResults(EMPTY);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(query)}&workspace_id=${workspaceId}`,
          );
          if (res.ok) {
            const data = await res.json();
            setResults(data);
          }
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [workspaceId],
  );

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current);
    setResults(EMPTY);
    setLoading(false);
  }, []);

  const total =
    results.messages.length +
    results.documents.length +
    results.channels.length;

  return { results, loading, search, clear, total };
}
