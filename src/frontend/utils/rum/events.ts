// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { DemoMilestone, ProductLabel } from './constants';
import { queueCaptureError, queueEmitMilestone } from './rumQueue';

type RumLabelMap = Record<string, string>;

export const emitMilestone = (milestone: DemoMilestone, product: ProductLabel): void => {
  if (typeof window === 'undefined') {
    return;
  }

  queueEmitMilestone(milestone, product);
};

export const captureLabeledError = (
  error: Error,
  product: ProductLabel,
  labels: RumLabelMap = {}
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  queueCaptureError(error, product, labels);
};

export const captureBlockingCheckoutError = (error: Error): void => {
  captureLabeledError(error, 'checkout', {
    demo_bug: 'blocking',
    business_impact: 'high',
  });
};

export const captureNoisyProductDetailError = (error: Error): void => {
  captureLabeledError(error, 'product-detail', {
    demo_bug: 'noisy',
    business_impact: 'low',
    noise_type: 'business-noise',
  });
};
