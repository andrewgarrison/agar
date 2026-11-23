import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@agar/react/popover';
import type { JSX } from 'react';

/** Live popovers: an explanation, a short form, one that opens above, and one in your own colour. */
export function Examples(): JSX.Element {
  return (
    <section aria-labelledby="examples" className="demo">
      <h2 id="examples">Examples</h2>
      <Popover>
        <PopoverTrigger>What is agar?</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Agar</PopoverTitle>
          <PopoverDescription>
            A seaweed gelatin that makes jelly set. Here, it sets soft-body surfaces over accessible components.
          </PopoverDescription>
          <PopoverClose>Done</PopoverClose>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger>Rename</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Rename the palette</PopoverTitle>
          <form className="popover-form">
            <label htmlFor="palette-name">Name</label>
            <input id="palette-name" name="name" defaultValue="Glass" autoComplete="off" />
          </form>
          <PopoverClose>Save</PopoverClose>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger>Opens above</PopoverTrigger>
        <PopoverContent side="top">
          <PopoverTitle>Placement</PopoverTitle>
          <PopoverDescription>
            Pick a side with <code>side</code>. It flips when there isn&apos;t room.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger>Your colours</PopoverTrigger>
        <PopoverContent className="popover-mint">
          <PopoverTitle>Mint</PopoverTitle>
          <PopoverDescription>
            One custom property, <code>--agar-jelly-tint</code>, recolours the jelly and the plain panel.
          </PopoverDescription>
          <PopoverClose>Done</PopoverClose>
        </PopoverContent>
      </Popover>
    </section>
  );
}
