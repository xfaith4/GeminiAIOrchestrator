// Cost tracking functionality for the Agentic Workflow Orchestrator
// Stores cost data in localStorage

export interface CostEntry {
  totalUSD: number;
  stepId: string;
  timestamp?: number;
}

export interface RunData {
  sessionId: string;
  costs: CostEntry[];
  totalCost: number;
}

// In-memory storage for cost data
let costLedger: RunData[] = [];

// Load cost ledger from localStorage on module load
try {
  const saved = localStorage.getItem('agentic-cost-ledger');
  if (saved) {
    costLedger = JSON.parse(saved);
  }
} catch (error) {
  console.error('Failed to load cost ledger:', error);
}

// Save cost ledger to localStorage
function saveCostLedger() {
  try {
    localStorage.setItem('agentic-cost-ledger', JSON.stringify(costLedger));
  } catch (error) {
    console.error('Failed to save cost ledger:', error);
  }
}

/**
 * Append a cost entry to a specific run
 */
export function appendRun(sessionId: string, costEntry: CostEntry) {
  const runIndex = costLedger.findIndex(run => run.sessionId === sessionId);

  if (runIndex >= 0) {
    // Update existing run
    costLedger[runIndex].costs.push({
      ...costEntry,
      timestamp: Date.now()
    });
    costLedger[runIndex].totalCost += costEntry.totalUSD;
  } else {
    // Create new run
    costLedger.push({
      sessionId,
      costs: [{
        ...costEntry,
        timestamp: Date.now()
      }],
      totalCost: costEntry.totalUSD
    });
  }

  saveCostLedger();
}

/**
 * Load the entire cost ledger
 */
export function loadLedger(): RunData[] {
  return [...costLedger];
}

/**
 * Export cost ledger as CSV
 */
export function exportLedgerCSV(): string {
  if (costLedger.length === 0) {
    return 'No cost data available';
  }

  const headers = ['Session ID', 'Step ID', 'Cost (USD)', 'Timestamp'];
  const rows = [headers.join(',')];

  costLedger.forEach(run => {
    run.costs.forEach(cost => {
      rows.push([
        run.sessionId,
        cost.stepId,
        cost.totalUSD.toString(),
        cost.timestamp ? new Date(cost.timestamp).toISOString() : ''
      ].join(','));
    });
  });

  return rows.join('\n');
}
