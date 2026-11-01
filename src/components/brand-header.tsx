import Image from "next/image";

export function BrandHeader() {
  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Image src="/icon.svg" alt="" width={44} height={44} className="rounded-2xl shadow-md shadow-primary/30" />
        <div className="leading-none">
          <p className="font-display text-xl font-bold text-primary">Giggles &amp; Kurls</p>
          <p className="text-xs font-semibold text-muted-foreground">Nail Salon</p>
        </div>
      </div>
    </header>
  );
}
