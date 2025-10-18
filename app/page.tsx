 import { CapturesBrowser } from "@/components/captures-browser"

 export default function Page() {
   return (
     <main className="min-h-dvh bg-black flex flex-col">
       <div className="flex-1 flex flex-col">
         <CapturesBrowser />
       </div>
     </main>
   )
 }
