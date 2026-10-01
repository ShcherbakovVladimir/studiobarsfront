import type * as React from 'react';

/**
 * React 19 держит HTML-теги в `React.JSX`, а не в глобальном `JSX`.
 * Языковой сервер редактора сверяет `<img>` с глобальным пространством имён,
 * поэтому без этой связки `JSX.IntrinsicElements` пустой по всему проекту.
 */
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    interface Element extends React.JSX.Element {}
    interface ElementClass extends React.JSX.ElementClass {}
    interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

export {};
