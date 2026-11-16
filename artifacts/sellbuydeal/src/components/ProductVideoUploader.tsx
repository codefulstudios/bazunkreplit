import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, Film, RotateCcw, X } from "lucide-react";

type UploadResult = { objectKey: string; url?: string };
type Props = {
  getToken: () => Promise<string | null>;
  onUploaded: (result: UploadResult | null) => void;
  disabled?: boolean;
  initialKey?: string;
};

/** Uploads straight to object storage with measurable network progress, not simulated percentages. */
export function ProductVideoUploader({ getToken, onUploaded, disabled, initialKey }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "preparing" | "uploading" | "done" | "error">(
    initialKey ? "done" : "idle"
  );
  const [name, setName] = useState(initialKey ? "Saved product video" : "");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => () => { xhr.current?.abort(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function upload(file: File) {
    xhr.current?.abort();
    onUploaded(null);
    setError("");
    setName(file.name);
    setProgress(0);
    if (file.size > 100 * 1024 * 1024 || !file.size) {
      setError("Choose a video smaller than 100 MB.");
      setPhase("error");
      return;
    }
    if (!["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"].includes(file.type)) {
      setError("Choose an MP4, MOV, AVI or WebM video.");
      setPhase("error");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setPhase("preparing");
    try {
      const token = await getToken();
      if (!token) throw Error("Sign in to upload a video.");
      const res = await fetch("/api/product-videos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(data.error || "Unable to prepare video upload.");
      if (!data.uploadUrl || !data.objectKey) throw Error("Upload service returned an invalid response.");
      setPhase("uploading");
      const request = new XMLHttpRequest();
      xhr.current = request;
      await new Promise<void>((resolve, reject) => {
        request.open("PUT", data.uploadUrl);
        for (const [key, value] of Object.entries(data.headers || {})) {
          request.setRequestHeader(key, String(value));
        }
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        };
        request.onerror = () => reject(Error("Network interrupted. Please retry."));
        request.onabort = () => reject(Error("Upload cancelled."));
        request.onload = () => request.status >= 200 && request.status < 300
          ? resolve()
          : reject(Error(`Storage rejected the upload (HTTP ${request.status}).`));
        request.send(file);
      });
      const confirm = await fetch("/api/product-videos/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ objectKey: data.objectKey }),
      });
      const confirmed = await confirm.json().catch(() => ({}));
      if (!confirm.ok) throw Error(confirmed.error || "Video uploaded but could not be verified.");
      setProgress(100);
      setPhase("done");
      onUploaded({ objectKey: data.objectKey, url: confirmed.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed.");
      setPhase("error");
    } finally { xhr.current = null; }
  }
  function reset() {
    xhr.current?.abort();
    setPhase("idle"); setProgress(0); setName(""); setError("");
    setPreview(""); onUploaded(null);
    if (input.current) input.current.value = "";
  }
  const busy = phase === "uploading" || phase === "preparing";
  return (
    <div className="rounded-2xl border border-violet-300/40 bg-gradient-to-br from-[#201b40] via-[#2e2355] to-[#161d40] p-5 text-white shadow-xl" data-testid="product-video-uploader">
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" className="hidden"
        onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/20 p-3"><Film className="h-6 w-6 text-violet-200" /></div>
        <div className="min-w-0 flex-1"><p className="font-bold">Product video</p><p className="truncate text-xs text-violet-200">{name || "MP4, MOV, AVI or WebM · Up to 100 MB"}</p></div>
        {phase === "done" && <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
      </div>
      {preview && <video className="mt-4 max-h-52 w-full rounded-xl bg-black object-contain" src={preview} controls />}
      {busy && <div className="mt-5" aria-live="polite">
        <div className="mb-2 flex justify-between text-sm"><span>{phase === "preparing" ? "Preparing secure upload…" : progress === 99 ? "Finishing upload…" : "Uploading your video…"}</span><strong>{progress}%</strong></div>
        <div className="h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-300 transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-violet-200">Keep this page open until the upload completes.</p>
      </div>}
      {phase === "done" && <p className="mt-3 text-sm font-semibold text-emerald-300">Video uploaded successfully ✓</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-500/15 p-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold disabled:opacity-40">
          <CloudUpload className="h-4 w-4" />{phase === "done" ? "Replace video" : "Select video"}
        </button>
        {(phase === "done" || phase === "error") && <button type="button" onClick={reset} className="flex items-center gap-1 rounded-xl border border-white/25 px-3 py-2 text-sm">
          {phase === "error" ? <RotateCcw className="h-4 w-4" /> : <X className="h-4 w-4" />}{phase === "error" ? "Try again" : "Remove"}
        </button>}
        {busy && <button type="button" onClick={reset} className="rounded-xl border border-white/25 px-3 py-2 text-sm">Cancel</button>}
      </div>
    </div>
  );
}
