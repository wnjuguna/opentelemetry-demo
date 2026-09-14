// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { ProductLabel } from './constants';
import { queueSetProductLabel } from './rumQueue';

export const setProductLabel = (product: ProductLabel): void => {
  if (typeof window === 'undefined') {
    return;
  }

  queueSetProductLabel(product);
};
