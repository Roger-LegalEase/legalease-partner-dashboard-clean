"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";

type EntryNavigation = { currentEntry: { index: number } | null };

/** Keep the form mounted across a history traversal until its save is acknowledged.
 * History contains only opaque markers, never answers. Next's state is preserved.
 */
export function usePacketDraftNavigation(dirty: boolean, save: () => Promise<unknown>, hasUnsavedChanges: () => boolean) {
  const router = useRouter();
  const [departing, setDeparting] = useState(false);
  const dirtyRef = useRef(dirty);
  const saveRef = useRef(save);
  const hasChangesRef = useRef(hasUnsavedChanges);
  const navigateRef = useRef<(path: string) => Promise<void>>(async () => {});
  const installRef = useRef<() => void>(() => {});
  useEffect(() => { dirtyRef.current = dirty; saveRef.current = save; hasChangesRef.current = hasUnsavedChanges; });

  useEffect(() => {
    const marker = crypto.randomUUID();
    const entryIndex = () => (window as Window & { navigation?: EntryNavigation }).navigation?.currentEntry?.index ?? null;
    let guarded = false;
    let guardIndex: number | null = null;
    let baseUrl = window.location.href;
    let departure: Promise<void> | null = null;
    let waiting: { kind: "restore" | "release"; resolve: () => void; promise: Promise<void> } | null = null;
    const isGuard = () => history.state?.legaleasePacketGuard === marker;
    const isBase = () => history.state?.legaleasePacketBase === marker && !isGuard();
    const install = () => {
      if (guarded || departure || !dirtyRef.current) return;
      baseUrl = window.location.href;
      history.replaceState({ ...history.state, legaleasePacketBase: marker }, "", baseUrl);
      history.pushState({ ...history.state, legaleasePacketGuard: marker }, "", baseUrl);
      guardIndex = entryIndex(); guarded = true;
    };
    const stepTo = (kind: "restore" | "release") => {
      const current = entryIndex();
      const target = guardIndex === null ? null : guardIndex - (kind === "release" ? 1 : 0);
      if (target !== null && current !== null && target !== current) history.go(target - current);
      else if (kind === "restore") history.forward();
      else history.back();
    };
    const traverse = (kind: "restore" | "release") => {
      if (kind === "restore" && isGuard()) return Promise.resolve();
      if (waiting) return waiting.promise;
      let resolve!: () => void;
      const promise = new Promise<void>((done) => { resolve = done; });
      waiting = { kind, resolve, promise };
      stepTo(kind);
      return promise;
    };
    const release = async () => {
      if (!guarded) return;
      await traverse("restore");
      await traverse("release");
    };
    installRef.current = install;
    const navigate = (path: string): Promise<void> => {
      if (departure) return departure;
      departure = (async () => {
        flushSync(() => setDeparting(true));
        if (hasChangesRef.current() && !await saveRef.current()) { setDeparting(false); return; }
        await release();
        router.push(path);
      })().finally(() => { departure = null; });
      return departure;
    };
    navigateRef.current = navigate;
    const pop = (event: PopStateEvent) => {
      if (waiting) {
        event.stopImmediatePropagation();
        const matched = waiting.kind === "restore" ? isGuard() : isBase();
        if (!matched) { stepTo(waiting.kind); return; }
        const done = waiting;
        waiting = null;
        if (done.kind === "release") {
          guarded = false;
          const state = { ...history.state }; delete state.legaleasePacketBase;
          history.replaceState(state, "", window.location.href);
        }
        done.resolve(); return;
      }
      if (!guarded) return;
      event.stopImmediatePropagation();
      if (isGuard()) return;
      // A repeated Back while saving restores the same form; it cannot start
      // another departure chain or silently replace the first navigation intent.
      if (departure) { void traverse("restore"); return; }
      const underlyingDuplicate = isBase();
      const observedTargetIndex = entryIndex();
      const targetIndex = underlyingDuplicate && guardIndex !== null ? guardIndex - 2 : observedTargetIndex;
      const targetUrl = window.location.href;
      departure = (async () => {
        await traverse("restore");
        flushSync(() => setDeparting(true));
        const saved = !hasChangesRef.current() || await saveRef.current();
        await traverse("restore");
        if (!saved) { setDeparting(false); return; }
        await release();
        const current = entryIndex();
        if (targetIndex !== null && targetIndex < 0) { setDeparting(false); return; }
        if (targetIndex !== null && current !== null) history.go(targetIndex - current);
        else if (underlyingDuplicate) history.back();
        else router.push(targetUrl); // Older browsers: retain the exact destination URL, never guess a multi-entry delta.
      })().finally(() => { departure = null; });
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasChangesRef.current()) return;
      event.preventDefault(); event.returnValue = "";
    };
    const follow = (event: MouseEvent) => {
      if ((!dirtyRef.current && !guarded) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.href === window.location.href || url.hash && url.pathname === window.location.pathname) return;
      event.preventDefault(); event.stopPropagation();
      void navigate(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("popstate", pop, true);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", follow, true);
    install();
    return () => {
      window.removeEventListener("popstate", pop, true);
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", follow, true);
      installRef.current = () => {};
      navigateRef.current = async () => {};
    };
  }, [router]);

  useEffect(() => { if (dirty) installRef.current(); }, [dirty]);
  const navigate = useCallback((path: string) => navigateRef.current(path), []);
  return { navigate, departing };
}
