// MV3 background entry. Listeners must register synchronously on first evaluation.

import { registerContextMenus } from './context-menus.js';
import { registerMediaStreamPort } from './media-stream.js';
import { registerMessageRouter } from './message-router.js';

registerContextMenus();
registerMediaStreamPort();
registerMessageRouter();
