"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LAW_BY_ID, chipLabel, fullReference, validIds } from "@/lib/law";

const INDIA_CODE_URL = "https://www.indiacode.nic.in/";

type SourceContextValue = { openSource: (id: string) => void };

const SourceContext = createContext<SourceContextValue>({ openSource: () => {} });

export function useSource(): SourceContextValue {
  return useContext(SourceContext);
}

/** One clickable chip. Renders nothing if the ID is not in the library. */
export function SourceChip({ id }: { id: string }) {
  const { openSource } = useSource();
  const entry = LAW_BY_ID.get(id);
  if (!entry) return null;
  return (
    <button
      type="button"
      className="src-chip"
      onClick={() => openSource(id)}
      aria-haspopup="dialog"
      title={`${entry.title}: open the provision`}
    >
      {chipLabel(entry)}
    </button>
  );
}

/** A row of chips. Invented or unknown IDs are dropped. */
export function SourceChips({ ids }: { ids: readonly string[] | null | undefined }) {
  const good = validIds(ids);
  if (good.length === 0) return null;
  return (
    <span className="src-row">
      {good.map((id) => (
        <SourceChip key={id} id={id} />
      ))}
    </span>
  );
}

export function SourceProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const entry = openId ? LAW_BY_ID.get(openId) : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (entry && !dialog.open) dialog.showModal();
    if (!entry && dialog.open) dialog.close();
  }, [entry]);

  const value = useMemo<SourceContextValue>(
    () => ({ openSource: (id) => setOpenId(id) }),
    [],
  );

  return (
    <SourceContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        className="src-dialog"
        aria-labelledby="src-dialog-title"
        onClose={() => setOpenId(null)}
        onClick={(e) => {
          // A click on the dark backdrop (the dialog itself) closes it.
          if (e.target === e.currentTarget) setOpenId(null);
        }}
      >
        {entry && (
          <div className="src-body">
            <h2 id="src-dialog-title">{entry.title}</h2>
            <p className="src-ref">{fullReference(entry)}</p>
            {entry.verify && (
              <p>
                <span className="badge badge-warn">Verify the exact wording</span>{" "}
                <span className="muted">
                  This summary has not been checked against the official text.
                </span>
              </p>
            )}
            <h3>What it says</h3>
            <p>{entry.summary}</p>
            <h3>What can happen</h3>
            <p>{entry.consequence}</p>
            <div className="src-actions">
              <a href={INDIA_CODE_URL} target="_blank" rel="noopener noreferrer" className="btn">
                Read the official text on India Code
              </a>
              <button type="button" className="btn btn-primary" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </SourceContext.Provider>
  );
}
