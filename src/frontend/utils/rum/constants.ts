// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

export const PRODUCT_LABELS = [
  'checkout',
  'cart',
  'product-detail',
  'order-confirmation',
  'home',
] as const;

export type ProductLabel = (typeof PRODUCT_LABELS)[number];

export const DEMO_MILESTONES = ['checkout_started', 'payment_completed'] as const;

export type DemoMilestone = (typeof DEMO_MILESTONES)[number];

export const isProductLabel = (value: string): value is ProductLabel =>
  (PRODUCT_LABELS as readonly string[]).includes(value);

export const isDemoMilestone = (value: string): value is DemoMilestone =>
  (DEMO_MILESTONES as readonly string[]).includes(value);
