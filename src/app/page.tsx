import { Transcriber } from '@/components/app/transcriber';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="container flex max-w-4xl flex-col items-center gap-8 px-4 py-8 md:py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
            Free Transcribe
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Upload your audio and get a free transcription. Your files are
            processed locally in your browser for privacy.
          </p>
        </div>
        <Transcriber />
      </div>
    </div>
  );
}
