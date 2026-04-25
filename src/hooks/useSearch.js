import { useReducer, useRef, useCallback } from "react";
import { searchAwards } from "../api/openalex.js";
import { searchProjects } from "../api/openaire.js";
import { mergeAndDedupe, applyFilters, sortBy } from "../analytics.js";
import { MAX_PAGES_DEFAULT } from "../api/config.js";

const initialState = {
  raw: { openalex: [], openaire: [] },
  canonical: [],
  loading: false,
  errors: [],
  progress: { openalex: { loaded: 0, total: 0 }, openaire: { loaded: 0, total: 0 } },
  fetchedAt: { openalex: null, openaire: null },
  totalFound: { openalex: 0, openaire: 0 },
  pages: { openalex: MAX_PAGES_DEFAULT, openaire: MAX_PAGES_DEFAULT },
};

function reducer(state, action) {
  switch (action.type) {
    case "START":
      return { ...initialState, loading: true };

    case "PROGRESS":
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.source]: { loaded: action.loaded ?? 0, total: action.total ?? 0 },
        },
      };

    case "SOURCE_DONE":
      return {
        ...state,
        raw: { ...state.raw, [action.source]: action.grants },
        fetchedAt: { ...state.fetchedAt, [action.source]: action.fetchedAt },
        totalFound: { ...state.totalFound, [action.source]: action.total },
      };

    case "SOURCE_ERROR":
      return {
        ...state,
        errors: [...state.errors, { source: action.source, message: action.message }],
      };

    case "DONE": {
      const merged = mergeAndDedupe([...state.raw.openalex, ...state.raw.openaire]);
      return { ...state, canonical: merged, loading: false };
    }

    case "CANCEL":
      return { ...state, loading: false };

    default:
      return state;
  }
}

export function useSearch() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef(null);

  const run = useCallback(async ({ keywords, sources = ["openalex", "openaire"], maxPages = MAX_PAGES_DEFAULT } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    dispatch({ type: "START" });

    const tasks = [];

    if (sources.includes("openalex")) {
      tasks.push(
        searchAwards({
          keywords,
          maxPages,
          signal,
          onProgress: ({ loaded, total }) =>
            dispatch({ type: "PROGRESS", source: "openalex", loaded, total }),
        })
          .then(({ grants, fetchedAt, total }) =>
            dispatch({ type: "SOURCE_DONE", source: "openalex", grants, fetchedAt, total })
          )
          .catch(e => {
            if (e.name !== "AbortError")
              dispatch({ type: "SOURCE_ERROR", source: "openalex", message: e.message });
          })
      );
    }

    if (sources.includes("openaire")) {
      tasks.push(
        searchProjects({
          keywords,
          maxPages,
          signal,
          onProgress: ({ loaded, total }) =>
            dispatch({ type: "PROGRESS", source: "openaire", loaded, total }),
        })
          .then(({ grants, fetchedAt, total }) =>
            dispatch({ type: "SOURCE_DONE", source: "openaire", grants, fetchedAt, total })
          )
          .catch(e => {
            if (e.name !== "AbortError")
              dispatch({ type: "SOURCE_ERROR", source: "openaire", message: e.message });
          })
      );
    }

    await Promise.allSettled(tasks);

    if (!signal.aborted) {
      dispatch({ type: "DONE" });
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "CANCEL" });
  }, []);

  // Derive filtered + sorted view from canonical — consumers pass filterState + sort
  const getView = useCallback((filterState, sortState) => {
    const filtered = applyFilters(state.canonical, filterState);
    return sortBy(filtered, sortState.column, sortState.direction);
  }, [state.canonical]);

  return { state, run, cancel, getView };
}
