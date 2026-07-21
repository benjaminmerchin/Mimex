import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { ArrowLeft, CircleStop, FileVideo, MonitorUp, RotateCcw, Upload, Video } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

type RecordingState = "choose" | "idle" | "requesting" | "recording" | "preview" | "uploading"
type SourceKind = "recorded" | "imported" | null

const MAX_VIDEO_BYTES = 500 * 1024 * 1024

function preferredMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ""
}

function looksLikeVideo(file: File): boolean {
  if (file.type.startsWith("video/")) return true
  return /\.(webm|mp4|m4v|mov|mkv)$/i.test(file.name)
}

export function RecordPage() {
  const navigate = useNavigate()
  const recorderRef = useRef<MediaRecorder | null>(null)
  const sourceStreamsRef = useRef<MediaStream[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const uploadFilenameRef = useRef("recording.webm")
  const [state, setState] = useState<RecordingState>("choose")
  const [sourceKind, setSourceKind] = useState<SourceKind>(null)
  const [recording, setRecording] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [microphoneIncluded, setMicrophoneIncluded] = useState(false)

  useEffect(() => {
    fetch("/api/me").then((response) => {
      if (response.status === 401) navigate("/login?next=/record", { replace: true })
    }).catch(() => navigate("/login?next=/record", { replace: true }))

    return () => {
      sourceStreamsRef.current.forEach((stream) => stream.getTracks().forEach((track) => track.stop()))
      void audioContextRef.current?.close()
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [navigate])

  function stopSources() {
    sourceStreamsRef.current.forEach((stream) => stream.getTracks().forEach((track) => track.stop()))
    sourceStreamsRef.current = []
    void audioContextRef.current?.close()
    audioContextRef.current = null
  }

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPreviewUrl(null)
    setRecording(null)
    setUploadProgress(0)
  }

  function chooseLiveRecording() {
    clearPreview()
    setSourceKind("recorded")
    setError(null)
    setState("idle")
  }

  function returnToChoices() {
    stopSources()
    clearPreview()
    setSourceKind(null)
    setError(null)
    setState("choose")
  }

  function importVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setError(null)
    if (!looksLikeVideo(file)) {
      setError("Choose a WebM, MP4, MOV, or MKV video file.")
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("The video exceeds the 500 MB limit.")
      return
    }

    clearPreview()
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    uploadFilenameRef.current = file.name
    setPreviewUrl(url)
    setRecording(file)
    setSourceKind("imported")
    setState("preview")
  }

  async function startRecording() {
    setError(null)
    setState("requesting")
    clearPreview()

    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setError("Screen recording is not supported in this browser. Open Mimex in Chrome.")
      setState("idle")
      return
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      let microphone: MediaStream | null = null
      try {
        microphone = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        microphone = null
      }

      sourceStreamsRef.current = microphone ? [display, microphone] : [display]
      setMicrophoneIncluded(Boolean(microphone))

      const output = new MediaStream(display.getVideoTracks())
      const audioTracks = sourceStreamsRef.current.flatMap((stream) => stream.getAudioTracks())
      if (audioTracks.length > 0) {
        const audioContext = new AudioContext()
        const destination = audioContext.createMediaStreamDestination()
        audioContextRef.current = audioContext
        for (const track of audioTracks) {
          audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination)
        }
        destination.stream.getAudioTracks().forEach((track) => output.addTrack(track))
      }

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = output
        await liveVideoRef.current.play().catch(() => undefined)
      }

      chunksRef.current = []
      const mimeType = preferredMimeType()
      const recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      recorder.ondataavailable = (chunk) => {
        if (chunk.data.size > 0) chunksRef.current.push(chunk.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" })
        const url = URL.createObjectURL(blob)
        uploadFilenameRef.current = `mimex-recording-${Date.now()}.webm`
        previewUrlRef.current = url
        setRecording(blob)
        setPreviewUrl(url)
        setState("preview")
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null
        stopSources()
      }
      display.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state === "recording") recorder.stop()
      })
      recorder.start(1000)
      setState("recording")
    } catch (cause) {
      stopSources()
      setState("idle")
      setError(cause instanceof Error && cause.name === "NotAllowedError"
        ? "Screen sharing was cancelled."
        : "Unable to start the screen recording.")
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
  }

  function discardRecording() {
    clearPreview()
    setError(null)
    setState(sourceKind === "imported" ? "choose" : "idle")
    if (sourceKind === "imported") setSourceKind(null)
  }

  function uploadRecording() {
    if (!recording) return
    setError(null)
    setUploadProgress(0)
    setState("uploading")

    const form = new FormData()
    form.append("recording", recording, uploadFilenameRef.current)
    const request = new XMLHttpRequest()
    request.open("POST", "/api/recordings")
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => {
      setError("The upload failed. Check your connection and try again.")
      setState("preview")
    }
    request.onload = () => {
      const body = (() => {
        try {
          return JSON.parse(request.responseText) as { id?: string; error?: string }
        } catch {
          return null
        }
      })()
      if (request.status === 401) {
        navigate("/login?next=/record", { replace: true })
        return
      }
      if (request.status !== 202 || !body?.id) {
        setError(body?.error ?? "Mimex could not save the video.")
        setState("preview")
        return
      }
      navigate(`/dashboard?run=${encodeURIComponent(body.id)}`)
    }
    request.send(form)
  }

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Dashboard
          </Link>
          <span className="flex items-center gap-2 font-semibold"><span className="grid size-7 place-items-center bg-primary font-mono text-xs text-primary-foreground">M</span>Mimex</span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">■ New skill</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          {state === "choose" ? "How do you want to create your skill?" : sourceKind === "imported" ? "Import a workflow video" : "Record a workflow live"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Record your screen while explaining the procedure, or import an existing walkthrough. Both use the same transcript, visual analysis, and skill generation pipeline.
        </p>

        {state === "choose" ? (
          <div className="mt-9 grid gap-px border bg-border sm:grid-cols-2">
            <button type="button" onClick={chooseLiveRecording} className="bg-background p-8 text-left transition hover:bg-card sm:p-10">
              <span className="grid size-12 place-items-center border bg-primary text-primary-foreground"><MonitorUp className="size-5" /></span>
              <h2 className="mt-6 text-xl font-medium">Record screen live</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Capture a tab, window, or full screen with system audio and your microphone explanation.</p>
              <span className="mt-6 inline-flex font-mono text-xs uppercase tracking-widest">Start recorder →</span>
            </button>
            <label className="cursor-pointer bg-background p-8 text-left transition hover:bg-card sm:p-10">
              <input type="file" accept="video/*,.webm,.mp4,.m4v,.mov,.mkv" className="sr-only" onChange={importVideo} />
              <span className="grid size-12 place-items-center border"><FileVideo className="size-5" /></span>
              <h2 className="mt-6 text-xl font-medium">Import existing video</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Upload a WebM, MP4, MOV, or MKV walkthrough up to 500 MB and turn it into a reusable skill.</p>
              <span className="mt-6 inline-flex font-mono text-xs uppercase tracking-widest">Choose video →</span>
            </label>
          </div>
        ) : (
          <div className="mt-9 overflow-hidden border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span>{sourceKind === "imported" ? uploadFilenameRef.current : "mimex_recorder"}</span>
              <span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${state === "recording" ? "animate-pulse bg-red-400" : "bg-muted-foreground"}`} />{state}</span>
            </div>

            <div className="aspect-video bg-black">
              {state === "recording" || state === "requesting" ? (
                <video ref={liveVideoRef} muted playsInline className="size-full object-contain" />
              ) : previewUrl ? (
                <video src={previewUrl} controls playsInline className="size-full object-contain" />
              ) : (
                <div className="grid size-full place-items-center text-center">
                  <div><span className="mx-auto grid size-16 place-items-center border border-white/15 text-white"><Video className="size-6" /></span><p className="mt-5 font-mono text-xs uppercase tracking-widest text-zinc-500">Your preview appears here</p></div>
                </div>
              )}
            </div>

            <div className="border-t p-5">
              {state === "idle" && <Button size="lg" onClick={startRecording}><Video className="size-4" /> Choose screen and record</Button>}
              {state === "requesting" && <Button size="lg" disabled><MonitorUp className="size-4" /> Waiting for screen access…</Button>}
              {state === "recording" && <div className="flex flex-wrap items-center gap-3"><Button size="lg" onClick={stopRecording}><CircleStop className="size-4" /> Stop recording</Button><span className="font-mono text-xs text-muted-foreground">{microphoneIncluded ? "Screen + microphone" : "Screen audio only"}</span></div>}
              {state === "preview" && <div className="flex flex-wrap gap-3"><Button size="lg" onClick={uploadRecording}><Upload className="size-4" /> Create skill from this video</Button><Button size="lg" variant="outline" onClick={discardRecording}><RotateCcw className="size-4" /> {sourceKind === "imported" ? "Choose another" : "Record again"}</Button></div>}
              {state === "uploading" && <div><div className="flex justify-between font-mono text-xs uppercase tracking-widest"><span>Uploading video</span><span>{uploadProgress}%</span></div><div className="mt-3 h-2 bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} /></div></div>}
              {state !== "recording" && state !== "requesting" && state !== "uploading" && <Button variant="ghost" className="mt-3" onClick={returnToChoices}>Back to choices</Button>}
              {error && <p className="mt-4 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}
        {state === "choose" && error && <p className="mt-4 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </section>
    </main>
  )
}
