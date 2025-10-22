"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Copy,
  Download,
  AlertTriangle,
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// We will load the pipeline and create a singleton instance of it.
// This is to avoid loading the model multiple times.
let pipelineSingleton: any = null;
const getTranscriptionPipeline = async (progress_callback?: Function) => {
  if (pipelineSingleton) {
      return pipelineSingleton;
  }
  const { pipeline } = await import('@xenova/transformers');
  const task = 'automatic-speech-recognition';
  const model = 'Xenova/whisper-tiny.en';
  pipelineSingleton = await pipeline(task, model, { progress_callback });
  return pipelineSingleton;
};

export function RealtimeTranscriber() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriberRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    const initializeTranscriber = async () => {
      setStatus("loading");
      setStatusText("Loading transcription model...");
      try {
        transcriberRef.current = await getTranscriptionPipeline((data: any) => {
          if (data.status === 'progress') {
              const currentProgress = Math.round(data.progress);
              setProgress(currentProgress);
              setStatusText(`Loading model... ${currentProgress}%`);
          }
        });
        setStatus("ready");
        setStatusText("Ready to record.");
      } catch (error) {
        console.error("Failed to initialize transcriber:", error);
        setStatus("error");
        setStatusText("Failed to load model. Please refresh the page.");
      }
    };
    initializeTranscriber();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [transcribedText]);

  const startRecording = async () => {
    if (status !== "ready" || !transcriberRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (!transcriberRef.current) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        
        setStatusText("Transcribing...");
        
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const fileReader = new FileReader();
        
        fileReader.onloadend = async () => {
            const arrayBuffer = fileReader.result as ArrayBuffer;
            if (!arrayBuffer) return;
            try {
                const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
                const audio = decodedAudio.getChannelData(0);

                const output = await transcriberRef.current(audio, {
                  chunk_length_s: 30,
                  stride_length_s: 5,
                });
                setTranscribedText(prev => prev + output.text);
                setStatusText("Ready to record.");
            } catch (error) {
                console.error("Error processing audio:", error);
                setStatus("error");
                setStatusText("Could not process audio. Please try again.");
            }
        };
        fileReader.readAsArrayBuffer(audioBlob);
      };

      mediaRecorder.start(3000); // Trigger ondataavailable every 3 seconds
      setIsRecording(true);
      setStatusText("Recording... Speak into your microphone.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setStatus("error");
      setStatusText("Microphone access denied. Please allow microphone access in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop all tracks in the stream to turn off the mic indicator
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setStatusText("Processing final audio...");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const handleCopy = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    toast({
      title: "Copied to clipboard!",
      description: "The transcribed text has been copied.",
    });
  };

  const handleDownload = () => {
    if (!transcribedText) return;
    const blob = new Blob([transcribedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "realtime_transcription.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Real-time Transcription</CardTitle>
        <CardDescription>
          Click the record button and start speaking. Transcription will appear in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'error' && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4"/>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{statusText}</AlertDescription>
            </Alert>
        )}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-full space-y-2">
              <p className="font-medium text-muted-foreground">{statusText}</p>
              <Progress value={progress} />
            </div>
          </div>
        )}
        
        {(status === 'ready' || isRecording) &&
          <div className="flex flex-col items-center gap-4">
            <Button onClick={toggleRecording} size="lg" className="w-24 h-24 rounded-full" disabled={status !== 'ready' && !isRecording}>
              {isRecording ? <MicOff size={48} /> : <Mic size={48} />}
            </Button>
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
        }

        {transcribedText && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Transcription Result</h3>
            <Textarea
              ref={textareaRef}
              value={transcribedText}
              readOnly
              className="min-h-[150px] resize-none"
              aria-label="Transcribed text"
            />
          </div>
        )}

      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {transcribedText && (
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
        )}
      </CardFooter>
    </Card>
  );
}
