const RAG_LIBRARY_CHANGED = 'studioxlam:rag-library-changed';

/** Notify RAG file sidebars to reload PDF OCR list and vector documents. */
export function notifyRagLibraryChanged(): void {
  window.dispatchEvent(new Event(RAG_LIBRARY_CHANGED));
}

export function subscribeRagLibraryChanged(onChange: () => void): () => void {
  window.addEventListener(RAG_LIBRARY_CHANGED, onChange);
  return () => window.removeEventListener(RAG_LIBRARY_CHANGED, onChange);
}
