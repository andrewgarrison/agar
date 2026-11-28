'use client';

import { Button } from '@agar/react/button';
import type { JSX } from 'react';

const SAVE_MS = 1500;

// Stands in for a slow request.
async function save(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, SAVE_MS);
  await promise;
}

/** Live buttons: plain ones, slow actions, and disabled ones. */
export function Examples(): JSX.Element {
  return (
    <section aria-labelledby="examples" className="demo">
      <h2 id="examples">Examples</h2>
      <div className="row">
        <Button>Publish</Button>
        <Button>Save draft</Button>
      </div>
      <div className="row">
        <Button onClick={save} pendingAnnouncement="Saving">
          <span data-show="pending" className="spinner" aria-hidden="true" />
          Save changes
        </Button>
        <Button onClick={save} pendingAnnouncement="Syncing">
          <span data-show="pending" className="spinner" aria-hidden="true" />
          Sync
        </Button>
      </div>
      <div className="row">
        <Button disabled>Archive</Button>
        <Button disabled focusableWhenDisabled aria-describedby="export-hint">
          Export
        </Button>
        <span id="export-hint" className="hint">
          Add a row to export.
        </span>
      </div>
    </section>
  );
}
