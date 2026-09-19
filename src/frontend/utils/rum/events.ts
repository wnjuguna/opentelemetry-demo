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

export const BROKEN_ADD_TO_CART_PRODUCT_IDS = ['66VCHSJNUP', '9SIQT8TOJO'] as const;

export type BrokenAddToCartProductId = (typeof BROKEN_ADD_TO_CART_PRODUCT_IDS)[number];

export const isBrokenAddToCartProductId = (
  productId: string
): productId is BrokenAddToCartProductId =>
  (BROKEN_ADD_TO_CART_PRODUCT_IDS as readonly string[]).includes(productId);

export const captureBrokenAddToCartError = (error: Error, productId: string): void => {
  captureLabeledError(error, 'product-detail', {
    demo_bug: 'broken-add-to-cart',
    business_impact: 'medium',
    'demo.product.id': productId,
  });
};
