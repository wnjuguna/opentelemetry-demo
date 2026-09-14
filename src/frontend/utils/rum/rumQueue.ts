// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { CoralogixRum } from '@coralogix/browser';
import type { DemoMilestone, ProductLabel } from './constants';

type RumLabelMap = Record<string, string>;

type RumExecutor = {
  setLabels: (labels: RumLabelMap) => void;
  info: (message: string, data: unknown, labels: RumLabelMap) => void;
  captureError: (error: Error, data: unknown, labels: RumLabelMap) => void;
};

let testExecutor: RumExecutor | null = null;

const rum = (): RumExecutor => testExecutor ?? CoralogixRum;

type QueuedOperation =
  | { type: 'milestone'; milestone: DemoMilestone; product: ProductLabel }
  | { type: 'error'; error: Error; product: ProductLabel; labels: RumLabelMap };

export type RumInitState = 'pending' | 'ready' | 'unavailable';

const MAX_QUEUE_SIZE = 32;

let initState: RumInitState = 'pending';
let pendingLabel: ProductLabel | null = null;
const pendingOperations: QueuedOperation[] = [];

const milestoneKey = (milestone: DemoMilestone, product: ProductLabel): string =>
  `${milestone}:${product}`;

const errorKey = (error: Error, product: ProductLabel, labels: RumLabelMap): string =>
  `${product}:${error.message}:${JSON.stringify(labels)}`;

const executeSetProductLabel = (product: ProductLabel): void => {
  rum().setLabels({ product });
};

const executeEmitMilestone = (milestone: DemoMilestone, product: ProductLabel): void => {
  rum().info(milestone, { milestone, product }, { product, milestone, event_type: 'milestone' });
};

const executeCaptureError = (
  error: Error,
  product: ProductLabel,
  labels: RumLabelMap
): void => {
  rum().captureError(error, { product }, { product, ...labels });
};

const executeOperation = (operation: QueuedOperation): void => {
  if (operation.type === 'milestone') {
    executeEmitMilestone(operation.milestone, operation.product);
    return;
  }

  executeCaptureError(operation.error, operation.product, operation.labels);
};

const flushPending = (): void => {
  if (pendingLabel) {
    executeSetProductLabel(pendingLabel);
    pendingLabel = null;
  }

  for (const operation of pendingOperations) {
    executeOperation(operation);
  }

  pendingOperations.length = 0;
};

const enqueueOperation = (operation: QueuedOperation): void => {
  if (initState === 'unavailable') {
    return;
  }

  if (initState === 'ready') {
    executeOperation(operation);
    return;
  }

  const key =
    operation.type === 'milestone'
      ? milestoneKey(operation.milestone, operation.product)
      : errorKey(operation.error, operation.product, operation.labels);

  const isDuplicate = pendingOperations.some(existing => {
    if (existing.type !== operation.type) {
      return false;
    }

    if (operation.type === 'milestone' && existing.type === 'milestone') {
      return milestoneKey(existing.milestone, existing.product) === key;
    }

    if (operation.type === 'error' && existing.type === 'error') {
      return errorKey(existing.error, existing.product, existing.labels) === key;
    }

    return false;
  });

  if (isDuplicate) {
    return;
  }

  pendingOperations.push(operation);

  if (pendingOperations.length > MAX_QUEUE_SIZE) {
    pendingOperations.shift();
  }
};

export const getRumInitState = (): RumInitState => initState;

export const queueSetProductLabel = (product: ProductLabel): void => {
  if (initState === 'unavailable') {
    return;
  }

  if (initState === 'ready') {
    executeSetProductLabel(product);
    return;
  }

  pendingLabel = product;
};

export const queueEmitMilestone = (milestone: DemoMilestone, product: ProductLabel): void => {
  enqueueOperation({ type: 'milestone', milestone, product });
};

export const queueCaptureError = (
  error: Error,
  product: ProductLabel,
  labels: RumLabelMap = {}
): void => {
  enqueueOperation({ type: 'error', error, product, labels });
};

export const markRumReady = (): void => {
  if (initState === 'unavailable') {
    return;
  }

  initState = 'ready';
  flushPending();
};

export const markRumUnavailable = (): void => {
  initState = 'unavailable';
  pendingLabel = null;
  pendingOperations.length = 0;
};

export const resetRumQueue = (): void => {
  initState = 'pending';
  pendingLabel = null;
  pendingOperations.length = 0;
  testExecutor = null;
};

export const setRumExecutorForTests = (executor: RumExecutor | null): void => {
  testExecutor = executor;
};

export const __testing__ = {
  getPendingLabel: (): ProductLabel | null => pendingLabel,
  getPendingOperations: (): readonly QueuedOperation[] => pendingOperations,
  MAX_QUEUE_SIZE,
};
