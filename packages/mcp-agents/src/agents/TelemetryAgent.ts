/**
 * Telemetry Agent - Analyzes performance metrics to optimize motion behavior
 */

import { BaseAgent } from '../core/BaseAgent';
import { MCPClient } from '../core/MCPClient';
import {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
} from '../types';

export interface TelemetryInput extends AgentInput {
  componentId?: string;
  sceneName?: string;
  metricsData?: PerformanceMetrics;
  analysisType?: 'performance' | 'usage' | 'errors' | 'all';
  threshold?: {
    fps?: number;
    frameTime?: number;
    memory?: number;
  };
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: number;
  renderCount: number;
  animationCount: number;
  timestamp: string;
  userAgent?: string;
  device?: string;
}

export interface PerformanceAnalysis {
  status: 'optimal' | 'warning' | 'critical';
  metrics: PerformanceMetrics;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
  optimizations: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }>;
}

export class TelemetryAgent extends BaseAgent {
  private mcpClient?: MCPClient;

  constructor(mcpClient: MCPClient) {
    const config: AgentConfig = {
      name: 'telemetry-agent',
      description: 'Analyzes collected metrics to optimize motion behavior.',
      usesTools: ['analyze_performance'],
      timeout: 60000,
      maxRetries: 2,
      tags: ['telemetry', 'performance', 'analytics'],
    };

    super(config);
    this.mcpClient = mcpClient;
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Ensure MCP client is connected
    if (!this.mcpClient?.isConnected()) {
      await this.mcpClient?.connect();
    }

    this.setState('initialized', true);
  }

  protected async doExecute(input: AgentInput): Promise<AgentOutput> {
    const telemetryInput = input as TelemetryInput;

    try {
      // Analyze performance via MCP
      const analysis = await this.analyzePerformance(
        telemetryInput.componentId,
        telemetryInput.sceneName,
        telemetryInput.metricsData,
        telemetryInput.threshold
      );

      // Generate report
      const report = this.generateReport(analysis);

      return {
        success: true,
        data: {
          analysis,
          report,
          status: analysis.status,
          issueCount: analysis.issues.length,
          criticalIssues: analysis.issues.filter(i => i.severity === 'critical').length,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: telemetryInput.analysisType || 'all',
          componentId: telemetryInput.componentId,
          sceneName: telemetryInput.sceneName,
        },
      };
    } catch (error) {
      throw new Error(`Failed to analyze telemetry: ${(error as Error).message}`);
    }
  }

  protected async doValidate(input: AgentInput): Promise<boolean> {
    const telemetryInput = input as TelemetryInput;

    // Must have either componentId, sceneName, or metricsData
    if (!telemetryInput.componentId && !telemetryInput.sceneName && !telemetryInput.metricsData) {
      return false;
    }

    return true;
  }

  protected async doCleanup(): Promise<void> {
    this.setState('initialized', false);
  }

  /**
   * Analyze performance via MCP
   */
  private async analyzePerformance(
    componentId?: string,
    sceneName?: string,
    metricsData?: PerformanceMetrics,
    threshold?: TelemetryInput['threshold']
  ): Promise<PerformanceAnalysis> {
    try {
      const result = await this.mcpClient!.invokeTool<any>({
        tool: 'analyze_performance',
        parameters: {
          componentId,
          sceneName,
          metricsData,
          threshold,
        },
      });

      // If MCP returns analysis directly, use it
      if (result.status && result.issues) {
        return result as PerformanceAnalysis;
      }

      // Otherwise, perform local analysis
      return this.performLocalAnalysis(metricsData, threshold);
    } catch (error) {
      // Fallback to local analysis if MCP fails
      console.warn('MCP analysis failed, using local analysis:', error);
      return this.performLocalAnalysis(metricsData, threshold);
    }
  }

  /**
   * Perform local analysis as fallback
   */
  private performLocalAnalysis(
    metricsData?: PerformanceMetrics,
    threshold?: TelemetryInput['threshold']
  ): PerformanceAnalysis {
    if (!metricsData) {
      throw new Error('No metrics data provided for analysis');
    }

    const defaultThreshold = {
      fps: threshold?.fps || 30,
      frameTime: threshold?.frameTime || 33,
      memory: threshold?.memory || 100 * 1024 * 1024, // 100MB
    };

    const issues: PerformanceAnalysis['issues'] = [];
    const recommendations: string[] = [];
    const optimizations: PerformanceAnalysis['optimizations'] = [];

    // Analyze FPS
    if (metricsData.fps < defaultThreshold.fps) {
      const severity = metricsData.fps < 20 ? 'critical' : metricsData.fps < 25 ? 'high' : 'medium';
      issues.push({
        severity,
        category: 'performance',
        description: `Low FPS detected: ${metricsData.fps.toFixed(2)} fps`,
        recommendation: 'Reduce animation complexity or optimize rendering',
      });

      recommendations.push('Consider reducing the number of concurrent animations');
      optimizations.push({
        type: 'animation',
        description: 'Reduce concurrent animations',
        impact: 'high',
        effort: 'medium',
      });
    }

    // Analyze frame time
    if (metricsData.frameTime > defaultThreshold.frameTime) {
      issues.push({
        severity: metricsData.frameTime > 50 ? 'high' : 'medium',
        category: 'performance',
        description: `High frame time: ${metricsData.frameTime.toFixed(2)}ms`,
        recommendation: 'Optimize render cycle or reduce complexity',
      });

      optimizations.push({
        type: 'rendering',
        description: 'Optimize render cycle',
        impact: 'high',
        effort: 'high',
      });
    }

    // Analyze memory
    if (metricsData.memory > defaultThreshold.memory) {
      issues.push({
        severity: 'medium',
        category: 'memory',
        description: `High memory usage: ${(metricsData.memory / 1024 / 1024).toFixed(2)}MB`,
        recommendation: 'Review resource cleanup and caching strategies',
      });

      recommendations.push('Implement proper cleanup for animation resources');
      optimizations.push({
        type: 'memory',
        description: 'Implement resource pooling',
        impact: 'medium',
        effort: 'medium',
      });
    }

    // Determine overall status
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasHigh = issues.some(i => i.severity === 'high');
    const status = hasCritical ? 'critical' : hasHigh ? 'warning' : 'optimal';

    return {
      status,
      metrics: metricsData,
      issues,
      recommendations,
      optimizations,
    };
  }

  /**
   * Generate analysis report
   */
  private generateReport(analysis: PerformanceAnalysis): string {
    let report = `# Performance Analysis Report\n\n`;
    report += `**Status:** ${analysis.status.toUpperCase()}\n\n`;

    report += `## Metrics\n\n`;
    report += `- FPS: ${analysis.metrics.fps.toFixed(2)}\n`;
    report += `- Frame Time: ${analysis.metrics.frameTime.toFixed(2)}ms\n`;
    report += `- Memory: ${(analysis.metrics.memory / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- Render Count: ${analysis.metrics.renderCount}\n`;
    report += `- Animation Count: ${analysis.metrics.animationCount}\n\n`;

    if (analysis.issues.length > 0) {
      report += `## Issues (${analysis.issues.length})\n\n`;
      analysis.issues.forEach((issue, i) => {
        report += `${i + 1}. **${issue.severity.toUpperCase()}** - ${issue.category}\n`;
        report += `   - ${issue.description}\n`;
        report += `   - Recommendation: ${issue.recommendation}\n\n`;
      });
    }

    if (analysis.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      analysis.recommendations.forEach((rec, i) => {
        report += `${i + 1}. ${rec}\n`;
      });
      report += `\n`;
    }

    if (analysis.optimizations.length > 0) {
      report += `## Optimization Opportunities\n\n`;
      analysis.optimizations.forEach((opt, i) => {
        report += `${i + 1}. **${opt.type}** - ${opt.description}\n`;
        report += `   - Impact: ${opt.impact}\n`;
        report += `   - Effort: ${opt.effort}\n\n`;
      });
    }

    report += `---\n`;
    report += `Generated: ${new Date().toISOString()}\n`;

    return report;
  }
}
