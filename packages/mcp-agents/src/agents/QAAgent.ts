/**
 * QA Agent - Validates wrappers and scenes against runtime surfaces and QA rules
 */

import { BaseAgent } from '../core/BaseAgent';
import { MCPClient } from '../core/MCPClient';
import {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
} from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface QAInput extends AgentInput {
  targetType: 'wrapper' | 'scene' | 'spec';
  targetId: string;
  targetPath?: string;
  runtimeSurface?: any;
  rules?: QARule[];
  outputPath?: string;
}

export interface QARule {
  id: string;
  name: string;
  category: 'compatibility' | 'performance' | 'accessibility' | 'best-practice';
  severity: 'error' | 'warning' | 'info';
  check: (target: any, context: any) => boolean | Promise<boolean>;
  message: string;
}

export interface QAValidation {
  valid: boolean;
  targetType: string;
  targetId: string;
  issues: Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    column?: number;
  }>;
  warnings: number;
  errors: number;
  info: number;
  score: number;
  report: string;
}

export class QAAgent extends BaseAgent {
  private mcpClient?: MCPClient;
  private readonly defaultOutputPath: string;
  private defaultRules: QARule[];

  constructor(mcpClient: MCPClient, outputPath?: string) {
    const config: AgentConfig = {
      name: 'qa-agent',
      description: 'Validates wrappers and scenes against runtime surfaces and QA rules.',
      usesTools: ['get_runtime_surface'],
      writes: ['libs/motion-qa'],
      timeout: 120000,
      maxRetries: 2,
      tags: ['qa', 'validation', 'compliance'],
    };

    super(config);
    this.mcpClient = mcpClient;
    this.defaultOutputPath = outputPath || 'libs/motion-qa';
    this.defaultRules = this.initializeDefaultRules();
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Ensure MCP client is connected
    if (!this.mcpClient?.isConnected()) {
      await this.mcpClient?.connect();
    }

    // Ensure output directory exists
    const outputPath = this.getOutputPath(context);
    await fs.mkdir(outputPath, { recursive: true });

    this.setState('initialized', true);
  }

  protected async doExecute(input: AgentInput): Promise<AgentOutput> {
    const qaInput = input as QAInput;

    try {
      // Load target
      const target = await this.loadTarget(qaInput.targetType, qaInput.targetPath);

      // Get runtime surface if needed
      let runtimeSurface = qaInput.runtimeSurface;
      if (!runtimeSurface && qaInput.targetType !== 'spec') {
        runtimeSurface = await this.getRuntimeSurface(qaInput.targetId);
      }

      // Run validation
      const validation = await this.validate(
        qaInput.targetType,
        qaInput.targetId,
        target,
        runtimeSurface,
        qaInput.rules || this.defaultRules
      );

      // Write validation report
      const outputPath = this.getOutputPath(this.context!);
      const reportPath = path.join(
        outputPath,
        `${this.sanitizeFileName(qaInput.targetId)}-validation.json`
      );
      await fs.writeFile(reportPath, JSON.stringify(validation, null, 2), 'utf-8');

      // Write human-readable report
      const readableReportPath = path.join(
        outputPath,
        `${this.sanitizeFileName(qaInput.targetId)}-validation.md`
      );
      await fs.writeFile(readableReportPath, validation.report, 'utf-8');

      return {
        success: validation.valid,
        data: {
          validation,
          reportPath,
          readableReportPath,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          targetType: qaInput.targetType,
          targetId: qaInput.targetId,
          score: validation.score,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      };
    } catch (error) {
      throw new Error(`Failed to validate target: ${(error as Error).message}`);
    }
  }

  protected async doValidate(input: AgentInput): Promise<boolean> {
    const qaInput = input as QAInput;

    if (!qaInput.targetType || !qaInput.targetId) {
      return false;
    }

    if (!['wrapper', 'scene', 'spec'].includes(qaInput.targetType)) {
      return false;
    }

    return true;
  }

  protected async doCleanup(): Promise<void> {
    this.setState('initialized', false);
  }

  /**
   * Load target file/data
   */
  private async loadTarget(targetType: string, targetPath?: string): Promise<any> {
    if (!targetPath) {
      return null;
    }

    try {
      const content = await fs.readFile(targetPath, 'utf-8');

      // Try to parse as JSON if spec
      if (targetType === 'spec') {
        return JSON.parse(content);
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to load target: ${(error as Error).message}`);
    }
  }

  /**
   * Get runtime surface via MCP
   */
  private async getRuntimeSurface(componentId: string): Promise<any> {
    try {
      const result = await this.mcpClient!.invokeTool({
        tool: 'get_runtime_surface',
        parameters: { componentId },
      });

      return result;
    } catch (error) {
      console.warn('Failed to get runtime surface:', error);
      return null;
    }
  }

  /**
   * Validate target against rules
   */
  private async validate(
    targetType: string,
    targetId: string,
    target: any,
    runtimeSurface: any,
    rules: QARule[]
  ): Promise<QAValidation> {
    const issues: QAValidation['issues'] = [];

    // Run all rules
    for (const rule of rules) {
      try {
        const passed = await rule.check(target, { runtimeSurface, targetType });

        if (!passed) {
          issues.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            message: rule.message,
          });
        }
      } catch (error) {
        console.warn(`Rule ${rule.id} failed:`, error);
      }
    }

    // Count by severity
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;

    // Calculate score (0-100)
    const totalRules = rules.length;
    const passedRules = totalRules - errors - warnings - info * 0.5;
    const score = Math.round((passedRules / totalRules) * 100);

    // Generate report
    const report = this.generateReport(targetType, targetId, issues, score);

    return {
      valid: errors === 0,
      targetType,
      targetId,
      issues,
      warnings,
      errors,
      info,
      score,
      report,
    };
  }

  /**
   * Generate validation report
   */
  private generateReport(
    targetType: string,
    targetId: string,
    issues: QAValidation['issues'],
    score: number
  ): string {
    let report = `# QA Validation Report\n\n`;
    report += `**Target:** ${targetType} - ${targetId}\n`;
    report += `**Score:** ${score}/100\n`;
    report += `**Date:** ${new Date().toISOString()}\n\n`;

    if (issues.length === 0) {
      report += `## Status\n\n`;
      report += `✅ All checks passed!\n\n`;
      return report;
    }

    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    report += `## Summary\n\n`;
    report += `- Errors: ${errors.length}\n`;
    report += `- Warnings: ${warnings.length}\n`;
    report += `- Info: ${infos.length}\n\n`;

    if (errors.length > 0) {
      report += `## Errors\n\n`;
      errors.forEach((issue, i) => {
        report += `${i + 1}. **${issue.ruleName}** (${issue.category})\n`;
        report += `   ${issue.message}\n\n`;
      });
    }

    if (warnings.length > 0) {
      report += `## Warnings\n\n`;
      warnings.forEach((issue, i) => {
        report += `${i + 1}. **${issue.ruleName}** (${issue.category})\n`;
        report += `   ${issue.message}\n\n`;
      });
    }

    if (infos.length > 0) {
      report += `## Information\n\n`;
      infos.forEach((issue, i) => {
        report += `${i + 1}. **${issue.ruleName}** (${issue.category})\n`;
        report += `   ${issue.message}\n\n`;
      });
    }

    return report;
  }

  /**
   * Initialize default QA rules
   */
  private initializeDefaultRules(): QARule[] {
    return [
      {
        id: 'no-missing-runtime-surface',
        name: 'Runtime Surface Required',
        category: 'compatibility',
        severity: 'error',
        check: async (target, context) => {
          return context.runtimeSurface !== null;
        },
        message: 'Runtime surface is missing or could not be loaded',
      },
      {
        id: 'valid-json-structure',
        name: 'Valid JSON Structure',
        category: 'best-practice',
        severity: 'error',
        check: async (target, context) => {
          if (context.targetType === 'spec') {
            return typeof target === 'object' && target !== null;
          }
          return true;
        },
        message: 'Invalid JSON structure for spec file',
      },
      {
        id: 'has-description',
        name: 'Has Description',
        category: 'best-practice',
        severity: 'warning',
        check: async (target, context) => {
          if (context.targetType === 'spec') {
            return target.description && target.description.length > 0;
          }
          return true;
        },
        message: 'Spec should include a description',
      },
      {
        id: 'has-animations',
        name: 'Has Animations',
        category: 'compatibility',
        severity: 'info',
        check: async (target, context) => {
          if (context.targetType === 'spec') {
            return target.animations && target.animations.length > 0;
          }
          return true;
        },
        message: 'Consider adding animations to the spec',
      },
    ];
  }

  /**
   * Get output path from context or use default
   */
  private getOutputPath(context: AgentContext): string {
    return (context.inputs as QAInput).outputPath || this.defaultOutputPath;
  }

  /**
   * Sanitize file name
   */
  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }
}
