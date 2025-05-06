#!/usr/bin/env node

import { ensMonitor } from './ens-monitoring.js';
import { Command } from 'commander';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const program = new Command();

program
  .name('ens-analytics')
  .description('ENS Query System Analytics Tool')
  .version('1.0.0');

program
  .command('report')
  .description('Generate and display current analytics report')
  .option('-d, --detailed', 'Show detailed metrics', false)
  .action(async (options) => {
    const report = await ensMonitor.generateReport();
    console.log('\nENS Query System Analytics Report');
    console.log('================================');
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    
    console.log('\nQuery Metrics:');
    console.log(`Total Queries: ${report.metrics.totalQueries}`);
    console.log(`Success Rate: ${(report.metrics.successRate * 100).toFixed(1)}%`);
    console.log(`Average Duration: ${report.metrics.averageDuration.toFixed(0)}ms`);
    
    if (options.detailed) {
      console.log('\nTime Distribution:');
      console.log('Hourly Distribution:');
      Object.entries(report.metrics.timeDistribution.hourly)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([hour, count]) => {
          console.log(`  ${hour}: ${count} queries`);
        });
      
      console.log('\nDaily Distribution:');
      Object.entries(report.metrics.timeDistribution.daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([day, count]) => {
          console.log(`  ${day}: ${count} queries`);
        });
    }
    
    console.log('\nQuery Type Breakdown:');
    for (const [type, stats] of Object.entries(report.metrics.queryTypes)) {
      console.log(`\n${type}:`);
      console.log(`  Count: ${stats.count}`);
      console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
      console.log(`  Duration: ${stats.averageDuration.toFixed(0)}ms avg, ${stats.minDuration}ms min, ${stats.maxDuration}ms max`);
      if (stats.errorCount > 0) {
        console.log(`  Errors: ${stats.errorCount}`);
        if (stats.lastError) {
          console.log(`  Last Error: ${stats.lastError}`);
        }
      }
    }
    
    console.log('\nCache Performance:');
    console.log(`Size: ${report.cache.size}`);
    console.log(`Hit Rate: ${(report.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`Hits: ${report.cache.hits}`);
    console.log(`Misses: ${report.cache.misses}`);
    console.log(`Evictions: ${report.cache.evictions}`);
    if (report.cache.oldestEntry) {
      console.log(`Oldest Entry: ${report.cache.oldestEntry.toISOString()}`);
    }
    if (report.cache.newestEntry) {
      console.log(`Newest Entry: ${report.cache.newestEntry.toISOString()}`);
    }
    
    if (options.detailed && report.ensStats.totalNamesQueried > 0) {
      console.log('\nENS Statistics:');
      console.log(`Total Names Queried: ${report.ensStats.totalNamesQueried}`);
      console.log(`Unique Owners: ${report.ensStats.uniqueOwners}`);
      
      console.log('\nRegistration Types:');
      console.log(`  Active: ${report.ensStats.registrationTypes.active}`);
      console.log(`  Expired: ${report.ensStats.registrationTypes.expired}`);
      console.log(`  Wrapped: ${report.ensStats.registrationTypes.wrapped}`);
      
      if (report.ensStats.mostQueriedNames.length > 0) {
        console.log('\nMost Queried Names:');
        report.ensStats.mostQueriedNames
          .slice(0, 5)
          .forEach(({ name, count }) => {
            console.log(`  ${name}: ${count} queries`);
          });
      }
      
      if (report.ensStats.topResolvers.length > 0) {
        console.log('\nTop Resolvers:');
        report.ensStats.topResolvers
          .slice(0, 5)
          .forEach(({ address, count }) => {
            console.log(`  ${address}: ${count} names`);
          });
      }
    }
  });

program
  .command('insights')
  .description('Get performance insights and recommendations')
  .action(async () => {
    const insights = await ensMonitor.getPerformanceInsights();
    console.log('\nPerformance Insights');
    console.log('===================');
    console.log(insights || 'No significant issues detected.');
  });

program
  .command('history')
  .description('View historical reports')
  .option('-l, --limit <number>', 'Number of reports to show', '5')
  .action(async (options) => {
    const limit = parseInt(options.limit);
    const reportsPath = join(process.cwd(), 'reports', 'ens-analytics');
    
    try {
      const files = await readdir(reportsPath);
      const reportFiles = files
        .filter(f => f.startsWith('ens-report-'))
        .sort()
        .slice(-limit);
      
      console.log('\nRecent Reports');
      console.log('=============');
      
      for (const file of reportFiles) {
        const report = JSON.parse(await readFile(join(reportsPath, file), 'utf-8'));
        console.log(`\n${file}`);
        console.log(`Timestamp: ${report.timestamp}`);
        console.log(`Total Queries: ${report.metrics.totalQueries}`);
        console.log(`Success Rate: ${(report.metrics.successRate * 100).toFixed(1)}%`);
      }
    } catch (error) {
      console.error('Error reading reports:', error);
    }
  });

program
  .command('trends')
  .description('Analyze query trends over time')
  .option('-d, --days <number>', 'Number of days to analyze', '7')
  .action(async (options) => {
    const days = parseInt(options.days);
    const reportsPath = join(process.cwd(), 'reports', 'ens-analytics');
    
    try {
      const files = await readdir(reportsPath);
      const reportFiles = files
        .filter(f => f.startsWith('ens-report-'))
        .sort()
        .slice(-days);
      
      const reports = await Promise.all(
        reportFiles.map(async file => {
          const content = await readFile(join(reportsPath, file), 'utf-8');
          return JSON.parse(content);
        })
      );
      
      console.log('\nENS Query Trends Analysis');
      console.log('=======================');
      console.log(`Analyzing last ${days} days`);
      
      // Calculate trends
      const successRates = reports.map(r => r.metrics.successRate);
      const avgDurations = reports.map(r => r.metrics.averageDuration);
      
      console.log('\nSuccess Rate Trend:');
      const successRateChange = ((successRates[successRates.length - 1] - successRates[0]) * 100).toFixed(1);
      console.log(`  Change: ${successRateChange}%`);
      console.log(`  Current: ${(successRates[successRates.length - 1] * 100).toFixed(1)}%`);
      
      console.log('\nQuery Duration Trend:');
      const durationChange = ((avgDurations[avgDurations.length - 1] - avgDurations[0]) / avgDurations[0] * 100).toFixed(1);
      console.log(`  Change: ${durationChange}%`);
      console.log(`  Current: ${avgDurations[avgDurations.length - 1].toFixed(0)}ms`);
      
      // Analyze query type trends
      console.log('\nQuery Type Trends:');
      const queryTypes = new Set(reports.flatMap(r => Object.keys(r.metrics.queryTypes)));
      for (const type of queryTypes) {
        const counts = reports.map(r => r.metrics.queryTypes[type]?.count || 0);
        const change = ((counts[counts.length - 1] - counts[0]) / counts[0] * 100).toFixed(1);
        console.log(`\n${type}:`);
        console.log(`  Change: ${change}%`);
        console.log(`  Current: ${counts[counts.length - 1]} queries`);
      }
      
    } catch (error) {
      console.error('Error analyzing trends:', error);
    }
  });

program.parse(process.argv); 