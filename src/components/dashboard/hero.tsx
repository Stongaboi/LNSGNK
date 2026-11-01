import Image from "next/image";

type HeroProps = { name: string | null };

export function Hero({ name }: HeroProps) {
  const firstName = name?.split(" ")[0];
  return (
    <section className="animate-rise relative overflow-hidden rounded-[2rem] shadow-xl shadow-primary/15">
      <Image
        src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80"
        alt="Glossy pink manicure at Giggles & Kurls"
        width={1200}
        height={800}
        priority
        className="h-64 w-full object-cover sm:h-80"
      />
      <div className="absolute inset-0 bg-[hsl(330_45%_18%/0.45)]" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          Welcome back
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
          Hey {firstName ?? "gorgeous"}! 💅
        </h1>
        <p className="mt-1 max-w-md text-base font-semibold text-white/90">
          Ready for some fresh nails and a few giggles?
        </p>
      </div>
    </section>
  );
}
