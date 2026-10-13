"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  createSection,
  duplicateSection,
  newId,
  reorder,
} from "@/lib/story/factory";
import type { SectionType, StoryDocument, StorySection } from "@/lib/story/schema";
import { api, ApiError } from "@/lib/client";

/* =========================================================================
   Editor state
   -------------------------------------------------------------------------
   A single reducer owns the document so every mutation is undoable. Autosave
   is debounced and version-checked: a 409 from the server surfaces a conflict
   banner instead of silently overwriting newer work.
   ========================================================================= */

type History = { past: StoryDocument[]; present: StoryDocument; future: StoryDocument[] };

type Action =
  | { type: "replace"; document: StoryDocument; reset?: boolean }
  | { type: "updateSection"; id: string; patch: Partial<StorySection> }
  | { type: "updateMeta"; patch: Partial<Pick<StoryDocument, "title" | "description" | "theme" | "typography" | "palette" | "seo" | "navigation" | "footer">> }
  | { type: "addSection"; sectionType: SectionType; atIndex?: number }
  | { type: "deleteSection"; id: string }
  | { type: "duplicateSection"; id: string }
  | { type: "moveSection"; from: number; to: number }
  | { type: "undo" }
  | { type: "redo" };

const MAX_HISTORY = 60;

function reducer(state: History, action: Action): History {
  const commit = (doc: StoryDocument): History => ({
    past: [...state.past.slice(-MAX_HISTORY), state.present],
    present: doc,
    future: [],
  });

  switch (action.type) {
    case "replace":
      return action.reset
        ? { past: [], present: action.document, future: [] }
        : commit(action.document);

    case "updateSection":
      return commit({
        ...state.present,
        sections: state.present.sections.map((s) =>
          s.id === action.id
            ? {
                ...s,
                ...action.patch,
                layout: { ...s.layout, ...(action.patch.layout ?? {}) },
                background: { ...s.background, ...(action.patch.background ?? {}) },
                animation: { ...s.animation, ...(action.patch.animation ?? {}) },
                responsive: { ...s.responsive, ...(action.patch.responsive ?? {}) },
                spacing: { ...s.spacing, ...(action.patch.spacing ?? {}) },
                interaction: { ...s.interaction, ...(action.patch.interaction ?? {}) },
              }
            : s,
        ),
      });

    case "updateMeta":
      return commit({ ...state.present, ...action.patch });

    case "addSection": {
      const section = createSection(action.sectionType);
      const sections = [...state.present.sections];
      const at = action.atIndex ?? sections.length;
      sections.splice(at, 0, section);
      return commit({ ...state.present, sections });
    }

    case "deleteSection":
      return commit({
        ...state.present,
        sections: state.present.sections.filter((s) => s.id !== action.id),
      });

    case "duplicateSection": {
      const index = state.present.sections.findIndex((s) => s.id === action.id);
      if (index < 0) return state;
      const sections = [...state.present.sections];
      sections.splice(index + 1, 0, duplicateSection(sections[index]));
      return commit({ ...state.present, sections });
    }

    case "moveSection":
      return commit({ ...state.present, sections: reorder(state.present.sections, action.from, action.to) });

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
}

export type SaveState = "saved" | "saving" | "dirty" | "conflict" | "error";

export function useEditor(initial: StoryDocument, storyId: string, initialRevision: number) {
  const [history, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(initial.sections[0]?.id ?? null);
  const [revision, setRevision] = useState(initialRevision);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const doc = history.present;
  const revisionRef = useRef(revision);
  revisionRef.current = revision;
  const saveTimer = useRef<number | null>(null);
  const pendingDoc = useRef<StoryDocument | null>(null);

  const dirty = saveState === "dirty" || saveState === "saving";

  const persist = useCallback(async () => {
    const toSave = pendingDoc.current ?? doc;
    pendingDoc.current = null;
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await api<{ revision: number; updatedAt: string }>(`/api/stories/${storyId}/autosave`, {
        method: "POST",
        json: { document: toSave, revision: revisionRef.current, title: toSave.title },
      });
      setRevision(res.revision);
      revisionRef.current = res.revision;
      setLastSavedAt(new Date(res.updatedAt));
      setSaveState("saved");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSaveState("conflict");
        setSaveError(error.message);
      } else {
        setSaveState("error");
        setSaveError((error as Error).message);
      }
    }
  }, [doc, storyId]);

  // Debounced autosave whenever the document changes after the first render.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState((s) => (s === "conflict" ? s : "dirty"));
    pendingDoc.current = doc;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persist(), 1100);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [doc, persist]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Keyboard shortcuts: undo / redo / save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if (e.key === "s") {
        e.preventDefault();
        void persist();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  const selected = useMemo(
    () => doc.sections.find((s) => s.id === selectedId) ?? null,
    [doc.sections, selectedId],
  );

  const saveNow = useCallback(() => persist(), [persist]);
  const reloadFromServer = useCallback(
    async (newDoc: StoryDocument, newRevision: number) => {
      dispatch({ type: "replace", document: newDoc, reset: true });
      setRevision(newRevision);
      revisionRef.current = newRevision;
      setSaveState("saved");
      setSaveError(null);
      setSelectedId((id) => (newDoc.sections.some((s) => s.id === id) ? id : newDoc.sections[0]?.id ?? null));
    },
    [],
  );

  return {
    doc,
    dispatch,
    selected,
    selectedId,
    setSelectedId,
    saveState,
    saveError,
    lastSavedAt,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    saveNow,
    reloadFromServer,
    revision,
  };
}

export { newId };
