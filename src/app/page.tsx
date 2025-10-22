import { Transcriber } from '@/components/app/transcriber';
import { RealtimeTranscriber } from '@/components/app/realtime-transcriber';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileAudio, Mic } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="container flex max-w-4xl flex-col items-center gap-8 px-4 py-8 md:py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
            Free Transcribe
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Transcribe audio for free using AI. Your files and microphone data are
            processed locally in your browser for privacy.
          </p>
        </div>

        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <FileAudio className="mr-2" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="realtime">
              <Mic className="mr-2" />
              Real-time
            </TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <Transcriber />
          </TabsContent>
          <TabsContent value="realtime">
            <RealtimeTranscriber />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
