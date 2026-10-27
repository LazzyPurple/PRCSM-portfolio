import KoiPond from "@/pond/KoiPond";

export default function Home() {
  return (
    <main className="pond relative isolate min-h-svh overflow-hidden">
      <KoiPond />
      <section
        data-koi-avoid
        className="paper absolute left-1/2 top-1/2 w-[min(25rem,calc(100%-3rem))] -translate-x-1/2 -translate-y-1/2 px-8 py-7 sm:px-10 sm:py-9"
      >
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Au fil de l’eau.</h1>
        <p className="mt-4 max-w-[24ch] text-sm leading-relaxed">
          Quelques idées prennent forme ici. Le reste viendra avec le courant.
        </p>
      </section>
    </main>
  );
}
