// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  __testing__,
  getRumInitState,
  markRumReady,
  markRumUnavailable,
  queueCaptureError,
  queueEmitMilestone,
  queueSetProductLabel,
  resetRumQueue,
  setRumExecutorForTests,
} from './rumQueue';

describe('rumQueue readiness', () => {
  beforeEach(() => {
    resetRumQueue();
  });

  it('queues labels and milestones until RUM is ready', () => {
    queueSetProductLabel('home');
    queueEmitMilestone('checkout_started', 'checkout');

    assert.equal(getRumInitState(), 'pending');
    assert.equal(__testing__.getPendingLabel(), 'home');
    assert.equal(__testing__.getPendingOperations().length, 1);
  });

  it('flushes queued telemetry after markRumReady', () => {
    const setLabels = mock.fn();
    const info = mock.fn();
    const captureError = mock.fn();
    setRumExecutorForTests({ setLabels, info, captureError });

    queueSetProductLabel('product-detail');
    queueEmitMilestone('payment_completed', 'order-confirmation');
    queueCaptureError(new Error('demo noisy error'), 'product-detail', { demo_bug: 'noisy' });

    markRumReady();

    assert.equal(getRumInitState(), 'ready');
    assert.equal(setLabels.mock.callCount(), 1);
    assert.deepEqual(setLabels.mock.calls[0]?.arguments[0], { product: 'product-detail' });
    assert.equal(info.mock.callCount(), 1);
    assert.equal(info.mock.calls[0]?.arguments[0], 'payment_completed');
    assert.equal(captureError.mock.callCount(), 1);
    assert.equal(__testing__.getPendingLabel(), null);
    assert.equal(__testing__.getPendingOperations().length, 0);
  });

  it('coalesces pending labels to the latest value', () => {
    const setLabels = mock.fn();
    setRumExecutorForTests({ setLabels, info: mock.fn(), captureError: mock.fn() });

    queueSetProductLabel('cart');
    queueSetProductLabel('checkout');

    markRumReady();

    assert.equal(setLabels.mock.callCount(), 1);
    assert.deepEqual(setLabels.mock.calls[0]?.arguments[0], { product: 'checkout' });
  });

  it('deduplicates queued milestones and errors', () => {
    queueEmitMilestone('checkout_started', 'checkout');
    queueEmitMilestone('checkout_started', 'checkout');
    queueCaptureError(new Error('same error'), 'product-detail', { demo_bug: 'noisy' });
    queueCaptureError(new Error('same error'), 'product-detail', { demo_bug: 'noisy' });

    assert.equal(__testing__.getPendingOperations().length, 2);
  });

  it('drops queued telemetry when RUM is unavailable', () => {
    queueSetProductLabel('home');
    queueEmitMilestone('checkout_started', 'checkout');

    markRumUnavailable();

    assert.equal(getRumInitState(), 'unavailable');
    assert.equal(__testing__.getPendingLabel(), null);
    assert.equal(__testing__.getPendingOperations().length, 0);

    const setLabels = mock.fn();
    setRumExecutorForTests({ setLabels, info: mock.fn(), captureError: mock.fn() });
    queueSetProductLabel('cart');
    queueEmitMilestone('payment_completed', 'order-confirmation');

    assert.equal(setLabels.mock.callCount(), 0);
    assert.equal(__testing__.getPendingOperations().length, 0);
  });

  it('bounds queued operations to prevent unbounded growth', () => {
    for (let index = 0; index < __testing__.MAX_QUEUE_SIZE + 5; index += 1) {
      queueCaptureError(new Error(`error-${index}`), 'product-detail', { index: String(index) });
    }

    assert.equal(__testing__.getPendingOperations().length, __testing__.MAX_QUEUE_SIZE);
  });

  it('executes immediately once ready without re-queueing', () => {
    const setLabels = mock.fn();
    const info = mock.fn();
    setRumExecutorForTests({ setLabels, info, captureError: mock.fn() });

    markRumReady();
    queueSetProductLabel('order-confirmation');
    queueEmitMilestone('payment_completed', 'order-confirmation');

    assert.equal(setLabels.mock.callCount(), 1);
    assert.equal(info.mock.callCount(), 1);
    assert.equal(__testing__.getPendingOperations().length, 0);
  });
});
