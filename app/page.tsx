import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { OneForAll } from "@/components/landing/OneForAll";
import { Pricing } from "@/components/landing/Pricing";
import { CtaBand } from "@/components/landing/CtaBand";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <OneForAll />
        <Pricing />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
