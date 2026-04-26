'use client';

import { VoteSummaryCards } from './vote-summary-cards';
import {
  DynamicVoteCountChart,
  DynamicCandidateComparisonChart,
} from './charts.dynamic';
import { PrecinctProgressTable } from './precinct-progress-table';
import { ResultsTimelineChart } from './results-timeline-chart';
import { TurnoutByRecintoTable } from './turnout-by-recinto-table';
import { ConnectionStatusIndicator } from './connection-status-indicator';
import type {
  DashboardSummary,
  PartyVoteData,
  TimelineDataPoint,
  RecintoTurnout,
  CandidateVoteData,
  PrecinctProgress,
} from '@/types/dashboard';

interface ElectionLiveDashboardProps {
  /** Summary totals for metric cards. */
  summary: DashboardSummary | null;
  /** Party vote data for the vertical bar chart. */
  partyVotes: PartyVoteData[];
  /** Timeline data for the line chart. */
  timeline: TimelineDataPoint[];
  /** Turnout data by recinto. */
  turnout: RecintoTurnout[];
  /** Candidate vote data for the horizontal comparison chart. */
  candidateVotes: CandidateVoteData[];
  /** Precinct progress data for the acta reporting table. */
  precinctProgress: PrecinctProgress[];
  /** Whether data is currently loading. */
  isLoading: boolean;
  /** Whether this is the active (live) electoral period. */
  isActivePeriod: boolean;
}

/**
 * Election-Night Live Dashboard container.
 *
 * Orchestrates all election-night monitoring sub-components in a responsive
 * grid layout optimized for desktop monitoring (large screens). Renders the
 * fixed-position ConnectionStatusIndicator when viewing an active period.
 *
 * Layout structure (desktop):
 *   Row 1: Summary metric cards (4-up)
 *   Row 2: VoteCountChart (left) + CandidateComparisonChart (right)
 *   Row 3: ResultsTimelineChart (full width)
 *   Row 4: PrecinctProgressTable (full width)
 *   Row 5: TurnoutByRecintoTable (full width)
 *
 * On mobile, all sections stack vertically in a single column.
 *
 * Accessibility:
 *   - Uses landmark region with aria-label
 *   - Section headings are provided by child components
 *   - ConnectionStatusIndicator uses role="status" with aria-live
 */
export function ElectionLiveDashboard({
  summary,
  partyVotes,
  timeline,
  turnout,
  candidateVotes,
  precinctProgress,
  isLoading,
  isActivePeriod,
}: ElectionLiveDashboardProps) {
  return (
    <section
      aria-label="Dashboard electoral en vivo"
      className="space-y-space-6"
    >
      {/* Summary Cards */}
      <VoteSummaryCards summary={summary} loading={isLoading} />

      {/* Charts Row: Vote Count + Candidate Comparison */}
      <div className="grid grid-cols-1 gap-space-4 lg:grid-cols-2">
        <DynamicVoteCountChart data={partyVotes} loading={isLoading} />
        <DynamicCandidateComparisonChart
          data={candidateVotes}
          loading={isLoading}
        />
      </div>

      {/* Timeline Chart (full width) */}
      <ResultsTimelineChart data={timeline} loading={isLoading} />

      {/* Precinct Progress Table (full width) */}
      <PrecinctProgressTable data={precinctProgress} loading={isLoading} />

      {/* Turnout Table (full width) */}
      <TurnoutByRecintoTable data={turnout} loading={isLoading} />

      {/* Fixed-position connection indicator (active periods only) */}
      {isActivePeriod && <ConnectionStatusIndicator />}
    </section>
  );
}
