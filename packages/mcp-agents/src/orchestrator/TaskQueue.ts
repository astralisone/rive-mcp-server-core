/**
 * Task queue for managing agent execution
 */

import { EventEmitter } from 'events';
import { QueuedTask, AgentPriority } from '../types';

export type QueueStrategy = 'fifo' | 'priority' | 'lifo';

export class TaskQueue extends EventEmitter {
  private queue: QueuedTask[] = [];
  private processing: Set<string> = new Set();
  private readonly maxConcurrent: number;
  private readonly strategy: QueueStrategy;

  constructor(maxConcurrent: number = 5, strategy: QueueStrategy = 'priority') {
    super();
    this.maxConcurrent = maxConcurrent;
    this.strategy = strategy;
  }

  /**
   * Add task to queue
   */
  enqueue(task: QueuedTask): void {
    this.queue.push(task);
    this.sortQueue();
    this.emit('taskQueued', task);
    this.processNext();
  }

  /**
   * Remove task from queue
   */
  dequeue(taskId: string): QueuedTask | undefined {
    const index = this.queue.findIndex(t => t.id === taskId);
    if (index === -1) {
      return undefined;
    }

    const [task] = this.queue.splice(index, 1);
    this.emit('taskDequeued', task);
    return task;
  }

  /**
   * Get next task based on strategy
   */
  private getNext(): QueuedTask | undefined {
    // Filter out tasks scheduled for future
    const now = new Date();
    const availableTasks = this.queue.filter(
      t => !t.startAfter || t.startAfter <= now
    );

    if (availableTasks.length === 0) {
      return undefined;
    }

    switch (this.strategy) {
      case 'fifo':
        return availableTasks[0];
      case 'lifo':
        return availableTasks[availableTasks.length - 1];
      case 'priority':
        return this.getHighestPriority(availableTasks);
      default:
        return availableTasks[0];
    }
  }

  /**
   * Get highest priority task
   */
  private getHighestPriority(tasks: QueuedTask[]): QueuedTask {
    const priorityOrder: AgentPriority[] = ['critical', 'high', 'normal', 'low'];

    for (const priority of priorityOrder) {
      const task = tasks.find(t => t.priority === priority);
      if (task) {
        return task;
      }
    }

    return tasks[0];
  }

  /**
   * Sort queue based on strategy
   */
  private sortQueue(): void {
    if (this.strategy === 'priority') {
      const priorityOrder: Record<AgentPriority, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
      };

      this.queue.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        // Secondary sort by queue time
        return a.queuedAt.getTime() - b.queuedAt.getTime();
      });
    }
  }

  /**
   * Process next task if capacity available
   */
  private processNext(): void {
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    const task = this.getNext();
    if (!task) {
      return;
    }

    const index = this.queue.indexOf(task);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.processing.add(task.id);
      this.emit('taskStarted', task);
    }
  }

  /**
   * Mark task as completed
   */
  complete(taskId: string): void {
    this.processing.delete(taskId);
    this.emit('taskCompleted', taskId);
    this.processNext();
  }

  /**
   * Mark task as failed
   */
  fail(taskId: string, error: Error): void {
    this.processing.delete(taskId);
    this.emit('taskFailed', { taskId, error });
    this.processNext();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get processing count
   */
  processingCount(): number {
    return this.processing.size;
  }

  /**
   * Check if task is processing
   */
  isProcessing(taskId: string): boolean {
    return this.processing.has(taskId);
  }

  /**
   * Get all queued tasks
   */
  getQueued(): QueuedTask[] {
    return [...this.queue];
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
    this.emit('queueCleared');
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      capacity: this.maxConcurrent,
      available: Math.max(0, this.maxConcurrent - this.processing.size),
    };
  }
}
