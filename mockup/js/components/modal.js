// Generic modal helper. Only one modal is mounted at a time.

const Modal = (() => {
  let root = null;

  function ensureRoot() {
    if (!root) {
      root = document.createElement("div");
      root.id = "modal-root";
      document.body.appendChild(root);
    }
    return root;
  }

  function close() {
    if (root) root.innerHTML = "";
  }

  function confirm({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false, onConfirm }) {
    const r = ensureRoot();
    r.innerHTML = `
      <div class="modal-backdrop" data-close-backdrop>
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">${title}</div>
          <div class="modal-body">${body}</div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">${cancelLabel}</button>
            <button class="btn ${destructive ? "btn-destructive" : "btn-primary"}" data-action="confirm">${confirmLabel}</button>
          </div>
        </div>
      </div>`;
    r.querySelector('[data-action="cancel"]').addEventListener("click", close);
    r.querySelector("[data-close-backdrop]").addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close-backdrop")) close();
    });
    r.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      close();
      onConfirm && onConfirm();
    });
  }

  function custom(html, mountFn) {
    const r = ensureRoot();
    r.innerHTML = `<div class="modal-backdrop" data-close-backdrop>${html}</div>`;
    r.querySelector("[data-close-backdrop]").addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close-backdrop")) close();
    });
    mountFn && mountFn(r, close);
  }

  return { confirm, custom, close };
})();
