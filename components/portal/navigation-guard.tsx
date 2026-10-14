"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Guard = {
  setPageReset: (action: (() => void) | null) => void;
  resetPage: () => void;
  setEditorState: (dirty: boolean, busy: boolean) => void;
  requestNavigation: (action: () => void) => void;
};
const NavigationGuardContext = createContext<Guard | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const pageReset = useRef<(() => void) | null>(null);
  const setPageReset = useCallback((action: (() => void) | null) => { pageReset.current = action; }, []);
  const resetPage = useCallback(() => { pageReset.current?.(); }, []);
  const editor = useRef({ dirty: false, busy: false });
  const trigger = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState<{ action: () => void } | null>(null);
  const setEditorState = useCallback((dirty: boolean, busy: boolean) => { editor.current = { dirty, busy }; }, []);
  const requestNavigation = useCallback((action: () => void) => {
    if (editor.current.busy) return;
    if (!editor.current.dirty) { action(); return; }
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPending({ action });
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (editor.current.dirty || editor.current.busy) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  const value = useMemo(() => ({ setEditorState, requestNavigation, setPageReset, resetPage }), [setEditorState, requestNavigation, setPageReset, resetPage]);
  return <NavigationGuardContext.Provider value={value}>
    {children}
    <Dialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
      <DialogContent role="alertdialog" showCloseButton={false} className="lp-office-confirm" onCloseAutoFocus={(event) => {
        if (trigger.current?.isConnected) { event.preventDefault(); trigger.current.focus(); }
      }}>
        <DialogHeader><DialogTitle>Discard your changes?</DialogTitle><DialogDescription>Your unsaved changes will be lost.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setPending(null)}>Keep editing</Button><Button onClick={() => { pending?.action(); setPending(null); }}>Discard changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </NavigationGuardContext.Provider>;
}

export function useNavigationGuard() {
  const guard = useContext(NavigationGuardContext);
  if (!guard) throw new Error("Navigation guard requires the authenticated workspace.");
  return guard;
}
