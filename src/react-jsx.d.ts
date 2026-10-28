/**
 * React 19 keeps HTML tag types on `React.JSX`, not the global `JSX` namespace.
 * Editor language services still check JSX against global `JSX.IntrinsicElements`,
 * so this bridge mirrors the official `react/jsx-runtime` shapes.
 */
import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    type ElementType = ReactJSX.ElementType;
    interface Element extends ReactJSX.Element {}
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

export {};
