"use client";

import { useState, useRef, useCallback, type ChangeEvent, useEffect } from "react";
import {
  BrainCircuit,
  Copy,
  Download,
  FileAudio,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TranscriptionStatus = "idle" | "loading" | "transcribing" | "error" | "done";

// We will load the pipeline dynamically to avoid SSR issues.
let pipelineSingleton: any = null;

export function Transcriber() {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriberRef = useRef<any>(null);

  const { toast } = useToast();

  const getTranscriptionPipeline = useCallback(async (progress_callback?: Function) => {
    if (pipelineSingleton) {
      return pipelineSingleton;
    }

    const { pipeline } = await import('@xenova/transformers');
    const task = 'automatic-speech-recognition';
    const model = 'Xenova/whisper-tiny.en';
    pipelineSingleton = await pipeline(task, model, { progress_callback });
    return pipelineSingleton;
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [transcribedText]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setStatus("idle");
      setTranscribedText("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setAudioFile(file);
      setStatus("idle");
      setTranscribedText("");
    }
  };

  const handleTranscribe = useCallback(async () => {
    if (!audioFile) return;

    setStatus("loading");
    setProgress(0);
    setStatusText("Loading transcription model...");

    try {
      if (!transcriberRef.current) {
        transcriberRef.current = await getTranscriptionPipeline((data: any) => {
          if (data.status === 'progress') {
              const currentProgress = Math.round(data.progress);
              setProgress(currentProgress);
              setStatusText(`Loading model... ${currentProgress}%`);
          }
        });
      }
      
      setStatusText("Model loaded. Starting transcription...");
      setStatus("transcribing");

      const audioForTranscription = await readAudioFromFile(audioFile);

      const output = await transcriberRef.current(audioForTranscription, {
        chunk_length_s: 30,
        stride_length_s: 5,
        progress_callback: (p: { progress: number }) => {
            const currentProgress = Math.round(p.progress);
            setProgress(currentProgress);
            setStatusText(`Transcribing... ${currentProgress}%`);
        },
      });

      if (typeof output === 'object' && output !== null && 'text' in output) {
        setTranscribedText(output.text as string);
        setStatus("done");
        setStatusText("Transcription complete.");
      } else {
        throw new Error("Transcription output is not in the expected format.");
      }

    } catch (error) {
      console.error(error);
      setStatus("error");
      setStatusText(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  }, [audioFile, getTranscriptionPipeline]);

  const readAudioFromFile = (file: File) => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDownload = () => {
    if (!transcribedText) return;
    const blob = new Blob([transcribedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${audioFile?.name.split('.')[0]}_transcription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    toast({
      title: "Copied to clipboard!",
      description: "The transcribed text has been copied.",
    });
  };

  const clearFile = () => {
    setAudioFile(null);
    setTranscribedText("");
    setStatus("idle");
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const isProcessing = status === "loading" || status === "transcribing";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>File-based Transcription</CardTitle>
        <CardDescription>
          Upload an MP3, WAV, or other audio file to begin. All processing is done in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'error' && (
            <Alert variant="destructive">
                <AlertTitle>Transcription Error</AlertTitle>
                <AlertDescription>{statusText}</AlertDescription>
            </Alert>
        )}

        {!audioFile && !isProcessing && (
          <label
            htmlFor="audio-upload"
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isDragOver ? "border-primary bg-accent" : "hover:border-primary/50 hover:bg-accent/50"
            )}
            onDragOver={(e) => {e.preventDefault(); e.stopPropagation(); setIsDragOver(true);}}
            onDragLeave={(e) => {e.preventDefault(); e.stopPropagation(); setIsDragOver(false);}}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-12 w-12 text-muted-foreground" />
            <span className="font-medium text-primary">Click to upload or drag and drop</span>
            <span className="text-sm text-muted-foreground">Supports MP3, WAV, M4A, etc.</span>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </label>
        )}

        {audioFile && !isProcessing && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                    <FileAudio className="h-6 w-6 text-primary"/>
                    <span className="truncate text-sm font-medium">{audioFile.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remove file">
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        )}

        {(isProcessing || status === 'loading') && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-full space-y-2">
              <p className="font-medium text-muted-foreground">{statusText}</p>
              <Progress value={progress} />
            </div>
          </div>
        )}

        {transcribedText && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Transcription Result</h3>
            <Textarea
              ref={textareaRef}
              value={transcribedText}
              readOnly
              className="min-h-[100px] resize-none overflow-y-hidden"
              aria-label="Transcribed text"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {status === 'done' || transcribedText ? (
            <>
                <Button variant="outline" onClick={handleCopy}>
                    <Copy />
                    Copy
                </Button>
                <Button onClick={handleDownload}>
                    <Download />
                    Download .txt
                </Button>
            </>
        ) : (
            <Button onClick={handleTranscribe} disabled={!audioFile || isProcessing}>
              {isProcessing ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <BrainCircuit />
              )}
              Transcribe
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
