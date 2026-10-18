import { handle } from './shared.js';
import { withIndexPolicy } from '../_gen/indexpolicy.js';
export const onRequest = withIndexPolicy(handle, 'lane-score');
