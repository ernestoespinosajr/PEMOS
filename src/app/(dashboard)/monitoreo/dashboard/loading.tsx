import { Card, CardContent } from '@/components/ui/card';

/**
 * Loading skeleton for the election-night dashboard.
 * Displayed by Next.js Suspense while the page chunk loads.
 *
 * Matches the ElectionLiveDashboard layout:
 *   Row 1: Summary cards (4-up)
 *   Row 2: Two chart cards (2-col grid)
 *   Row 3: Timeline chart (full width)
 *   Row 4: Precinct progress table skeleton (full width)
 *   Row 5: Turnout table skeleton (full width)
 */
export default function DashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-space-6">
        <div className="mb-space-2 h-4 w-36 animate-pulse rounded bg-neutral-200" />
        <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
        <div className="mt-space-1 h-4 w-80 animate-pulse rounded bg-neutral-200" />
      </div>

      {/* Period selector skeleton */}
      <div className="mb-space-6">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        <div className="mt-1.5 h-9 w-80 animate-pulse rounded bg-neutral-200" />
      </div>

      {/* Summary cards skeleton */}
      <div className="mb-space-6 grid grid-cols-2 gap-space-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-100" />
              <div>
                <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
                <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row skeleton (Vote Count + Candidate Comparison) */}
      <div className="mb-space-6 grid grid-cols-1 gap-space-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 h-4 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="h-72 animate-pulse rounded bg-neutral-100" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 h-4 w-44 animate-pulse rounded bg-neutral-200" />
            <div className="h-72 animate-pulse rounded bg-neutral-100" />
          </CardContent>
        </Card>
      </div>

      {/* Timeline chart skeleton (full width) */}
      <div className="mb-space-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 h-4 w-48 animate-pulse rounded bg-neutral-200" />
            <div className="h-72 animate-pulse rounded bg-neutral-100" />
          </CardContent>
        </Card>
      </div>

      {/* Precinct progress table skeleton */}
      <div className="mb-space-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 h-4 w-40 animate-pulse rounded bg-neutral-200" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-neutral-100"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnout table skeleton */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 h-4 w-44 animate-pulse rounded bg-neutral-200" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded bg-neutral-100"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
