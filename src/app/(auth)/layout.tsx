import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-space-4">
      <main id="main-content" className="w-full max-w-md" role="main">
        {/* Brand */}
        <div className="mb-space-8 text-center">
          <Image
            src="/logo.svg"
            alt="PEMOS"
            width={48}
            height={48}
            className="mx-auto mb-space-4"
            priority
          />
          <h1 className="text-2xl font-bold text-primary-dark">PEMOS</h1>
          <p className="mt-space-1 text-sm text-secondary-text">
            Sistema de Monitoreo Electoral
          </p>
        </div>

        {children}
      </main>
    </div>
  );
}
