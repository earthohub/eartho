type PageHeaderProps = {
  title: string;
  intro?: string;
};

export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <header className="mb-12 border-b border-stone-200 pb-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight text-teal-950 sm:text-4xl">
        {title}
      </h1>
      {intro ? (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
          {intro}
        </p>
      ) : null}
    </header>
  );
}
