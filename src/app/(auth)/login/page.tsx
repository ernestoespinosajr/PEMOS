export default function LoginPage() {
  return (
    <div className="rounded-xl border border-border bg-surface p-space-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary-text">
        Iniciar Sesion
      </h2>
      <p className="mt-space-1 text-sm text-secondary-text">
        Ingrese sus credenciales para acceder al sistema
      </p>

      <form className="mt-space-6 space-y-space-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-body-text"
          >
            Correo Electronico
          </label>
          <input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            className="mt-space-1 block w-full rounded-md border border-border bg-surface px-space-3 py-space-2 text-base text-primary-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-body-text"
          >
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            placeholder="********"
            autoComplete="current-password"
            className="mt-space-1 block w-full rounded-md border border-border bg-surface px-space-3 py-space-2 text-base text-primary-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-space-4 py-space-2 text-sm font-medium text-white transition-colors duration-hover hover:bg-primary-light active:bg-primary-dark active:scale-[0.98]"
        >
          Iniciar Sesion
        </button>
      </form>

      <div className="mt-space-4 text-center">
        <a
          href="/reset-password"
          className="text-sm text-primary transition-colors duration-hover hover:text-primary-light hover:underline"
        >
          Olvidaste tu contrasena?
        </a>
      </div>
    </div>
  );
}
