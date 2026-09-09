import { useEffect, useRef, useCallback } from 'react';

/**
 * useBroadcastChannel
 *
 * Thin wrapper around the native BroadcastChannel API.
 * Lets multiple tabs on the same origin communicate without a server.
 *
 * @param {string} channelName  - Shared channel name (same name = same channel).
 * @param {(msg: any) => void} onMessage - Called with the parsed message data
 *                                         whenever another tab posts to this channel.
 *                                         Messages sent by THIS tab are NOT received here.
 *
 * @returns {{ postMessage: (data: any) => void }}
 *
 * Usage:
 *   const { postMessage } = useBroadcastChannel('ide-sync', (msg) => {
 *     if (msg.type === 'file_saved') { ... }
 *   });
 *   postMessage({ type: 'file_saved', fileId: '...', content: '...' });
 */
export function useBroadcastChannel(channelName, onMessage) {
  const channelRef  = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep the callback ref current without re-subscribing
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Open the channel once, close on unmount
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return; // SSR / old browser guard

    const ch = new BroadcastChannel(channelName);
    channelRef.current = ch;

    ch.onmessage = (event) => {
      onMessageRef.current?.(event.data);
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [channelName]); // Only re-create if the channel name changes

  const postMessage = useCallback((data) => {
    channelRef.current?.postMessage(data);
  }, []);

  return { postMessage };
}
