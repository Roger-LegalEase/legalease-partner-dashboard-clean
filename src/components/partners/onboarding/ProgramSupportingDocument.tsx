"use client";

import { useRef, useState } from "react";

/** Optional evidence uses the existing private onboarding asset transaction. */
export function ProgramSupportingDocument({ spanish, disabled, uploadAvailable, beforeUpload, afterUpload, onPendingChange }: {
  spanish: boolean;
  disabled: boolean;
  uploadAvailable: boolean;
  beforeUpload: () => Promise<number>;
  afterUpload: () => Promise<void>;
  onPendingChange: (pending: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [assets, setAssets] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const request = useRef<{ digest: string; version: number; id: string } | null>(null);
  const t = (en: string, es: string) => spanish ? es : en;

  async function load() {
    try {
      const response = await fetch("/api/partners/onboarding/workspace", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.onboarding) throw new Error(t("Saved documents could not be loaded. Close and reopen this section to retry.", "No se pudieron cargar los documentos guardados. Cierre y vuelva a abrir esta sección para reintentar."));
      setAssets(body.onboarding.assets.filter((a: { category: string }) => a.category === "procurement_document").map((a: { id: string; originalFileName: string; reviewStatus: string }) => ({ id: a.id, name: a.originalFileName, status: a.reviewStatus })));
    } catch (error) { setMessage(error instanceof Error ? error.message : t("Document information is unavailable. Retry.", "La información del documento no está disponible. Reintente.")); }
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || pending) return;
    if (file.size > 4 * 1024 * 1024) { setMessage(t("Choose a file of at most 4 MB.", "Elija un archivo de hasta 4 MB.")); return; }
    setPending(true); onPendingChange(true); setMessage("");
    try {
      const version = await beforeUpload();
      const digest = `${file.name}:${Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map(b => b.toString(16).padStart(2, "0")).join("")}`;
      // An interrupted upload reuses its original version and request identity.
      if (request.current?.digest !== digest) request.current = { digest, version, id: crypto.randomUUID() };
      data.set("category", "procurement_document");
      data.set("requestId", request.current.id);
      data.set("expectedWorkspaceVersion", String(request.current.version));
      const response = await fetch("/api/partners/onboarding/assets", { method: "POST", body: data });
      const body = await response.json();
      if (!response.ok || !body.asset) {
        if (response.status === 409) { request.current = null; await afterUpload(); }
        throw new Error(body.error ?? t("The document could not be uploaded. Retry.", "No se pudo cargar el documento. Inténtelo de nuevo."));
      }
      setAssets(current => [{ id: body.asset.id, name: body.asset.originalFileName, status: body.asset.reviewStatus }, ...current.filter(asset => asset.id !== body.asset.id)]);
      await afterUpload();
      request.current = null;
      form.reset();
      setMessage(t("Private document saved for LegalEase review. Uploading does not sign an agreement or authorize services.", "Documento privado guardado para revisión de LegalEase. Cargarlo no firma un acuerdo ni autoriza servicios."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Upload could not be confirmed. Retry the same file.", "No se pudo confirmar la carga. Vuelva a intentar con el mismo archivo."));
    } finally { setPending(false); onPendingChange(false); }
  }

  return <details className="sm:col-span-2 rounded-xl border p-4" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary className="min-h-11 cursor-pointer font-bold">{t("Supporting document (optional)", "Documento de respaldo (opcional)")}</summary>
    <p className="my-3 text-sm">{t("Use this only when your arrangement needs an existing policy, procurement document or agreement. Standard screening setup does not require an upload.", "Úselo solo si su modalidad requiere una política, documento de contratación o acuerdo existente. La configuración estándar de evaluación no requiere cargar archivos.")}</p>
    {uploadAvailable ? <form onSubmit={upload} className="space-y-3">
      <label className="block">{t("Private supporting document — PDF or DOCX, up to 4 MB", "Documento privado de respaldo — PDF o DOCX, hasta 4 MB")}
        <input className="mt-2 min-h-11 w-full rounded border p-2" name="file" type="file" accept=".pdf,.docx" required disabled={disabled || pending}/>
      </label>
      <button type="submit" className="min-h-11 rounded border px-4 font-bold disabled:opacity-50" disabled={disabled || pending}>{pending ? t("Uploading…", "Cargando…") : t("Upload supporting document", "Cargar documento de respaldo")}</button>
    </form> : <p>{t("Your current program is under review or published. Contact LegalEase to change its supporting documents.", "Su programa actual está en revisión o publicado. Contacte a LegalEase para cambiar sus documentos de respaldo.")} <a className="inline-flex min-h-11 items-center underline" href="mailto:partners@legalease.com">{t("Contact LegalEase", "Contactar a LegalEase")}</a></p>}
    <p role="status" className="mt-3">{message}</p>
    {assets.map(asset => <p key={asset.id}><a className="inline-flex min-h-11 items-center underline" href={`/api/partners/onboarding/assets/${asset.id}`} target="_blank" rel="noopener noreferrer">{t("Inspect", "Inspeccionar")} {asset.name}</a>{" · "}{asset.status === "approved" ? t("Reviewed", "Revisado") : asset.status === "rejected" ? t("Needs attention", "Necesita atención") : t("Awaiting review", "Pendiente de revisión")}</p>)}
  </details>;
}
