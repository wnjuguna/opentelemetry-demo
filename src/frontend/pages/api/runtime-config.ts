// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { NextApiRequest, NextApiResponse } from 'next';
import { buildRuntimeConfigFromEnv } from '../../utils/rum/buildRuntimeConfig';
import type { RumRuntimeConfig } from '../../utils/rum/types';

const handler = (_req: NextApiRequest, res: NextApiResponse<RumRuntimeConfig>) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(buildRuntimeConfigFromEnv(process.env));
};

export default handler;
