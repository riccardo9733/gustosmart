"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Sparkles, 
  Film, 
  Video, 
  Link as LinkIcon, 
  Clock, 
  ArrowRight, 
  ChefHat 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;
    alert(`Importing recipe from: ${videoUrl}`);
  };

  const setPlatformUrl = (platform: string) => {
    if (platform === "instagram") {
      setVideoUrl("https://www.instagram.com/reel/example");
    } else if (platform === "tiktok") {
      setVideoUrl("https://www.tiktok.com/@example/video/12345");
    } else {
      setVideoUrl("https://giallozafferano.it/ricette/example");
    }
  };

  const featuredRecipes = [
    {
      id: "bowl-mediterranea",
      title: "Bowl Mediterranea",
      time: "15 min",
      tags: ["Vegano", "Salute"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9LDhxMVved3KIEPCpWexmPC3Wcd_6tFQG8k1TIWSNsSr-yX4MzzW4-j48lV0Uv5mXqeHUS3gb11UpJPS6oZm7vynS41jjvJyjjjW4TiJc3VPiiqcESSlAHKof_A3HGKJJAgEYE40QdnIvhOZjC1BBQDMPmiCBiH1rieRlniMDTJ6IZ6M1mFNXbx3ir3X3Vhebh-9NhyV_Yb1E2IVSwYFffAi9RXYPTvfol57xXZIg2rQKCByESOoCGhWnUPCBsCx398poU2BYkg",
      alt: "Mediterranean bowl with grilled tofu, quinoa, and avocado"
    },
    {
      id: "pesto-rosso",
      title: "Pesto Rosso Artigianale",
      time: "25 min",
      tags: ["Pasta", "Rapido"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBE-I3F-AtczPIvGDCBj-VyfNEvcMIuLefwNJyqx0Iqc-FXabZZ47j4-UWIKJuoQ_Sse5gQ-D3oOR6YBJjDyCx_7Tpt10pDaaEyWExJqJ4rNFQHxjrK_5aE3Y-utrhE8DYp0uV2y7YzcB_c5y5ZxeAk22jt9_WMwlRFi2WHfdY5TRH7QfXtNaG5Iblp_q1gYBk6V2ANkFKaheiCB9g9G1OngQtkB4oEtYQtgbfMngnC567bQdwZnyucMIlS-vxwmQHPTLkQLiB9Ng",
      alt: "Handmade tagliatelle with sun-dried tomato pesto"
    },
    {
      id: "avocado-toast",
      title: "Avocado Toast Spicy",
      time: "10 min",
      tags: ["Brunch", "Proteine"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBlMdxSXeRFzaHpx6790ld5vxmHay2xizlbb4ySHUCCsfoUhil8EPFfpY5c3p5_BAwnKE4QmW6hzP5o2ie-gXfOVv5uZyjsKtSRLhf7p8Vut_cJLT8Lpztg6MxZkkGZKpwscG8aerEpVJKu1uQH3YS_imiU32YT3f9fv2Nu9cm0Ao5GKeiq85kASk0i3GjilabfMlbNnqNjbgaELio50jqHpMCtWuuNhV-FaQu1311lg7JurOgj61QlrwnbjxlS_ZZn6OPr0VMXFg",
      alt: "Sourdough avocado toast topped with poached eggs"
    }
  ];

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl lg:max-w-2xl">
          Trasforma i tuoi Reel in <span className="text-primary">ricette reali</span>
        </h2>
        
        {/* URL Import Input */}
        <form onSubmit={handleImport} className="relative group w-full max-w-lg mt-8">
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full -z-10 transition-all duration-500 group-focus-within:bg-primary/20"></div>
          <div className="flex items-center glass-panel rounded-full p-1.5 shadow-xl shadow-primary/5 border border-primary/20 focus-within:border-primary transition-all">
            <Input 
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Incolla il link del video qui..." 
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-5 text-sm h-11"
            />
            <Button 
              type="submit" 
              size="icon"
              className="bg-primary hover:bg-primary/95 text-white rounded-full h-11 w-11 shadow-lg active:scale-95 transition-all"
            >
              <Sparkles className="h-5 w-5 fill-white" />
            </Button>
          </div>
        </form>

        {/* Suggestion Badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button 
            onClick={() => setPlatformUrl("instagram")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <Film className="h-4 w-4 text-primary" />
            Instagram Reel
          </button>
          <button 
            onClick={() => setPlatformUrl("tiktok")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <Video className="h-4 w-4 text-primary" />
            TikTok Video
          </button>
          <button 
            onClick={() => setPlatformUrl("web")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <LinkIcon className="h-4 w-4 text-primary" />
            Link Web
          </button>
        </div>
      </section>

      {/* Ultimi Arrivi Carousel */}
      <section className="w-full">
        <div className="flex justify-between items-end mb-6">
          <h3 className="font-heading text-xl font-semibold text-foreground">Ultimi Arrivi</h3>
          <Link href="/recipes" className="text-primary font-semibold text-sm flex items-center gap-1 hover:underline">
            Vedi tutto <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        {/* Carousel Container */}
        <div className="flex overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6">
          {featuredRecipes.map((recipe) => (
            <Card key={recipe.id} className="min-w-[280px] max-w-[280px] snap-start glass-panel rounded-[24px] overflow-hidden border border-white/40 dark:border-white/10 shadow-xl shadow-primary/5 hover:scale-[1.02] transition-transform duration-300">
              <div className="h-48 relative w-full">
                <Image 
                  src={recipe.image}
                  alt={recipe.alt}
                  fill
                  sizes="280px"
                  className="object-cover"
                  priority
                />
                <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {recipe.time}
                </div>
              </div>
              <CardContent className="p-5 flex flex-col gap-3 bg-transparent">
                <h4 className="font-heading text-lg font-bold text-foreground leading-snug">
                  {recipe.title}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {recipe.tags[0]}
                  </span>
                  <span className="bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {recipe.tags[1]}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Smart Tip Banner */}
      <section className="glass-panel rounded-[24px] p-5 flex items-center gap-4 border-l-4 border-l-primary shadow-lg shadow-primary/5">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <ChefHat className="h-7 w-7 text-primary" />
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-foreground">Suggerimento Smart</h4>
          <p className="text-sm text-muted-foreground leading-tight mt-0.5">
            Il tuo forno è preriscaldato? Sincronizza le ricette con GustoHub.
          </p>
        </div>
      </section>
    </div>
  );
}
