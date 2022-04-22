import { act, renderHook } from '@testing-library/react-hooks';
import { ReadyState, useTypeSocket } from '../src';

function mockSocket() {
  const references: any = {
    lastMessage: '',
    socket: undefined,
  };

  global['WebSocket'] = class WebSocket {
    public readyState = 1;
    public onclose?: (e: CloseEvent) => void;
    public onmessage?: (e: MessageEvent) => void;
    public onopen?: () => void;
    public onerror?: () => void;

    constructor(url: string, protocols?: string | string[]) {
      references.socket = this;
    }

    close() {}

    send(data: string) {
      references.lastMessage = data;
    }
  } as any;

  return references;
}

const TEST_URL = 'ws://example.com/example';
const ANOTHER_TEST_URL = 'ws://example.com/test';

describe('useTypeSocket', () => {
  it("doesn't crash", () => {
    expect(() => {
      renderHook(() => useTypeSocket(TEST_URL));
    }).not.toThrow();
  });

  it('sends messages', () => {
    const references = mockSocket();
    const { result } = renderHook(() => useTypeSocket(TEST_URL));

    act(() => references.socket?.onopen());

    result.current.sendMessage({
      type: 'test',
    });

    expect(JSON.parse(references.lastMessage)).toEqual({ type: 'test' });
  });

  it('receives and parses messages', () => {
    const references = mockSocket();
    const { result } = renderHook(() => useTypeSocket(TEST_URL));

    act(() => {
      references.socket?.onopen();
      references.socket?.onmessage({
        data: JSON.stringify({ type: 'test' }),
      });
    });

    expect(result.current.lastMessage).toEqual(
      expect.objectContaining({ type: 'test' })
    );
  });

  it('updates readyState', () => {
    const references = mockSocket();
    const { result } = renderHook(() => useTypeSocket(TEST_URL));

    expect(result.current.readyState).toBe(ReadyState.CONNECTING);
    act(() => references.socket?.onopen());
    expect(result.current.readyState).toBe(ReadyState.OPEN);
    act(() => references.socket?.onclose({ code: 0 }));
    expect(result.current.readyState).toBe(ReadyState.CLOSED);
  });

  it('handles URL updates', () => {
    const references = mockSocket();
    const { result, rerender } = renderHook<
      { url: any },
      ReturnType<typeof useTypeSocket>
    >(({ url }) => useTypeSocket(url), {
      initialProps: {
        url: null,
      },
    });

    expect(result.current.readyState).toBe(ReadyState.UNINSTANTIATED);

    rerender({ url: TEST_URL });

    expect(result.current.readyState).toBe(ReadyState.CONNECTING);
    act(() => references.socket?.onopen());
    expect(result.current.readyState).toBe(ReadyState.OPEN);
    act(() => references.socket?.onclose({ code: 0 }));
    expect(result.current.readyState).toBe(ReadyState.CLOSED);

    rerender({ url: ANOTHER_TEST_URL });

    expect(result.current.readyState).toBe(ReadyState.CONNECTING);

    rerender({ url: null });

    expect(result.current.readyState).toBe(ReadyState.UNINSTANTIATED);
  });

  it('handles null URL', () => {
    const { result } = renderHook(() => useTypeSocket(null));

    expect(result.current.readyState).toBe(ReadyState.UNINSTANTIATED);
  });
});
