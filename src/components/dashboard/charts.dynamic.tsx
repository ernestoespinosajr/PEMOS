'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './dashboard-skeleton';

/**
 * Dynamically imported chart components.
 *
 * Recharts is ~200KB and should NOT be included in the initial bundle
 * for non-dashboard pages. Using next/dynamic with ssr: false ensures:
 * - Chart code is code-split into a separate chunk
 * - Charts only load on the client (Recharts requires window/DOM)
 * - ChartSkeleton provides immediate visual feedback while loading
 *
 * Per Design-Criteria.md:
 *   "Heavy components dynamically imported:
 *    dynamic(() => import('./ElectionChart'), { loading: () => <ChartSkeleton /> })"
 */

export const DynamicMemberBarChart = dynamic(
  () =>
    import('./member-bar-chart').then((mod) => ({
      default: mod.MemberBarChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

export const DynamicRegistrationLineChart = dynamic(
  () =>
    import('./registration-line-chart').then((mod) => ({
      default: mod.RegistrationLineChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

export const DynamicDistributionPieChart = dynamic(
  () =>
    import('./distribution-pie-chart').then((mod) => ({
      default: mod.DistributionPieChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

// ---------- Election-Night Charts ----------

export const DynamicVoteCountChart = dynamic(
  () =>
    import('./vote-count-chart').then((mod) => ({
      default: mod.VoteCountChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

export const DynamicCandidateComparisonChart = dynamic(
  () =>
    import('./candidate-comparison-chart').then((mod) => ({
      default: mod.CandidateComparisonChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);
