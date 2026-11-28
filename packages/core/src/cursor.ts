// The mouse cursor, anywhere on the page, for lens lighting: a lens's rim
// light leans toward it (after bilalgursen/liquid-glass, MIT). Only a mouse
// counts; touch and pen have no cursor to follow. The listeners go on with the
// first surface that follows the cursor, so importing this has no side effects.

/** Where the cursor is, in client px, and whether it's on the page. */
export interface Cursor {
  x: number;
  y: number;
  active: boolean;
}

/** Called whenever the cursor moves, arrives or leaves. */
type Wake = () => void;

const state: { cursor: Cursor; listeners: Set<Wake>; installed: boolean } = {
  cursor: { x: 0, y: 0, active: false },
  listeners: new Set<Wake>(),
  installed: false,
};

function notify(): void {
  for (const wake of state.listeners) {
    wake();
  }
}

function install(): void {
  if (state.installed) {
    return;
  }
  state.installed = true;
  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      state.cursor.x = event.clientX;
      state.cursor.y = event.clientY;
      state.cursor.active = true;
      notify();
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    state.cursor.active = false;
    notify();
  });
}

/** The cursor as it is now. */
export function cursor(): Readonly<Cursor> {
  return state.cursor;
}

/** Calls `wake` whenever the cursor moves, arrives or leaves. Returns a function that stops it. */
export function followCursor(wake: Wake): () => void {
  install();
  state.listeners.add(wake);
  return () => {
    state.listeners.delete(wake);
  };
}
