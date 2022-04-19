import { useEffect, useRef, useState, useCallback } from 'react';
import { TypeSocket, TypeSocketOptions } from 'typesocket';

export enum ReadyState {
  UNINSTANTIATED = -1,
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export const useTypeSocket = <T>(
  url?: string | null,
  options?: TypeSocketOptions
) => {
  const socketRef = useRef<TypeSocket<T>>();
  const [lastMessage, setLastMessage] = useState<T>();
  const [readyState, setReadyState] = useState<ReadyState>(
    ReadyState.UNINSTANTIATED
  );
  const sendMessage = useCallback(
    (message: any) => {
      if (readyState === ReadyState.OPEN) {
        socketRef.current?.send(message);
      }
    },
    [readyState]
  );

  const messageListener = useCallback((message: T) => setLastMessage(message), [
    setLastMessage,
  ]);
  const connectedListener = useCallback(() => setReadyState(ReadyState.OPEN), [
    setReadyState,
  ]);
  const disconnectedListener = useCallback(
    () => setReadyState(ReadyState.CONNECTING),
    [setReadyState]
  );
  const permanentlyDisconnectedListener = useCallback(
    () => setReadyState(ReadyState.CLOSED),
    [setReadyState]
  );

  useEffect(() => {
    if (socketRef.current) {
      const socket = socketRef.current;
      socket.off('message', messageListener);
      socket.off('connected', connectedListener);
      socket.off('disconnected', disconnectedListener);
      socket.off('permanentlyDisconnected', permanentlyDisconnectedListener);
      socket.disconnect();
    }
    setReadyState(ReadyState.UNINSTANTIATED);

    if (url) {
      setReadyState(ReadyState.CONNECTING);
      const socket = new TypeSocket<T>(url, options);

      socket.on('message', messageListener);
      socket.on('connected', connectedListener);
      socket.on('disconnected', disconnectedListener);
      socket.on('permanentlyDisconnected', permanentlyDisconnectedListener);

      socket.connect();
      socketRef.current = socket;
    }
  }, [
    url,
    options,
    messageListener,
    connectedListener,
    disconnectedListener,
    permanentlyDisconnectedListener,
    setLastMessage,
  ]);

  return {
    readyState,
    lastMessage,
    sendMessage,
  };
};
