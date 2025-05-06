import { getQueryMetrics, getCacheStats } from './ens-configurator.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface AnalyticsReport {
  timestamp: Date;
  metrics: {
    totalQueries: number;
    successRate: number;
    averageDuration: number;
    queryTypes: Record<string, {
      count: number;
      successRate: number;
      averageDuration: number;
    }>;
  };
  cache: {
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
  };
}

export class ENSMonitor {
  private static instance: ENSMonitor;
  private metrics: any[] = [];
  private reportPath: string;

  private constructor() {
    this.reportPath = join(process.cwd(), 'reports', 'ens-analytics');
    // Ensure reports directory exists
    mkdir(this.reportPath, { recursive: true }).catch(console.error);
  }

  public static getInstance(): ENSMonitor {
    if (!ENSMonitor.instance) {
      ENSMonitor.instance = new ENSMonitor();
    }
    return ENSMonitor.instance;
  }

  public async generateReport(): Promise<AnalyticsReport> {
    const metrics = getQueryMetrics();
    const cacheStats = getCacheStats();

    // Calculate time distribution
    const hourlyDistribution: Record<string, number> = {};
    const dailyDistribution: Record<string, number> = {};
    
    metrics.forEach(m => {
      const hour = m.timestamp.toISOString().slice(0, 13);
      const day = m.timestamp.toISOString().slice(0, 10);
      
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;
    });

    const report: AnalyticsReport = {
      timestamp: new Date(),
      metrics: {
        totalQueries: metrics.length,
        successRate: metrics.filter(m => m.success).length / metrics.length,
        averageDuration: metrics.reduce((acc, m) => acc + m.duration, 0) / metrics.length,
        queryTypes: {},
        timeDistribution: {
          hourly: hourlyDistribution,
          daily: dailyDistribution
        }
      },
      cache: {
        size: cacheStats.size,
        hitRate: cacheStats.ratio,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        evictions: cacheStats.evictions || 0,
        oldestEntry: cacheStats.oldestEntry || null,
        newestEntry: cacheStats.newestEntry || null
      },
      ensStats: {
        totalNamesQueried: 0,
        uniqueOwners: 0,
        mostQueriedNames: [],
        registrationTypes: {
          active: 0,
          expired: 0,
          wrapped: 0
        },
        topResolvers: []
      }
    };

    // Calculate metrics by query type
    const queryTypes = new Set(metrics.map(m => m.queryType));
    for (const type of queryTypes) {
      const typeMetrics = metrics.filter(m => m.queryType === type);
      const durations = typeMetrics.map(m => m.duration);
      const errors = typeMetrics.filter(m => !m.success);
      
      report.metrics.queryTypes[type] = {
        count: typeMetrics.length,
        successRate: typeMetrics.filter(m => m.success).length / typeMetrics.length,
        averageDuration: durations.reduce((acc, d) => acc + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        errorCount: errors.length,
        lastError: errors.length > 0 ? errors[errors.length - 1].error : undefined
      };
    }

    // Save report to file
    const filename = `ens-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await writeFile(
      join(this.reportPath, filename),
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  public async getPerformanceInsights(): Promise<string> {
    const report = await this.generateReport();
    const insights: string[] = [];

    // Query performance insights
    if (report.metrics.successRate < 0.95) {
      insights.push(`Warning: Overall success rate is ${(report.metrics.successRate * 100).toFixed(1)}%`);
    }

    // Cache performance insights
    if (report.cache.hitRate < 0.3) {
      insights.push(`Cache hit rate is low (${(report.cache.hitRate * 100).toFixed(1)}%). Consider increasing cache size or TTL.`);
    }

    // Query type specific insights
    for (const [type, stats] of Object.entries(report.metrics.queryTypes)) {
      if (stats.successRate < 0.9) {
        insights.push(`Query type "${type}" has low success rate (${(stats.successRate * 100).toFixed(1)}%)`);
      }
      if (stats.averageDuration > 1000) {
        insights.push(`Query type "${type}" is slow (${stats.averageDuration.toFixed(0)}ms average)`);
      }
    }

    return insights.join('\n');
  }
}

// Export singleton instance
export const ensMonitor = ENSMonitor.getInstance(); 