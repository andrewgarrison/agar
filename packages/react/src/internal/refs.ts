import type { Ref, RefCallback, RefObject } from 'react';
import { useCallback } from 'react';

function assign<Value>(ref: Ref<Value> | undefined, value: Value | null): void {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

/** One ref callback that fills both the component's own ref and the consumer's. */
export function useMergedRef<Value>(
  innerRef: RefObject<Value | null>,
  outerRef: Ref<Value> | undefined,
): RefCallback<Value> {
  return useCallback(
    (node: Value | null) => {
      innerRef.current = node;
      assign(outerRef, node);
    },
    [innerRef, outerRef],
  );
}
