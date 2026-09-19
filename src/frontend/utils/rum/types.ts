// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

export interface RumRuntimeConfig {
  publicKey?: string;
  application: string;
  environment: string;
  version: string;
  coralogixDomain: string;
  coralogixDomainUrl?: string;
  bugBlocking: boolean;
  bugNoisy: boolean;
  brokenAddToCart: boolean;
}
