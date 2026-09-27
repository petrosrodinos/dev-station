const openTreePaths = new Set(["platform"]);

function renderFiles(proj) {
  return `
    <div class="input-search" style="margin-bottom:12px;max-width:320px;">
      ${icon("search", { size: 14 })}
      <input class="input" placeholder="Search files…" />
    </div>
    <div class="card">
      <div class="card-body scroll-y" style="max-height:calc(100vh - 320px);">
        <div class="tree">${treeNodeHtml(Store.state.fileTree)}</div>
      </div>
    </div>
  `;
}

function treeNodeHtml(node, path = "") {
  const fullPath = path ? `${path}/${node.name}` : node.name;
  if (node.type === "dir") {
    const open = openTreePaths.has(fullPath);
    return `
      <div class="tree-item">
        <div class="tree-row ${open ? "open" : ""}" data-action="toggle-tree" data-path="${fullPath}">
          <span class="chev">${icon("chevron-right", { size: 13 })}</span>
          ${icon(open ? "folder-open" : "folder", { size: 14 })}
          <span>${node.name}</span>
          <div class="row-actions">
            <button class="btn-icon" data-action="reveal-file" data-path="${fullPath}" title="Reveal in file manager">${icon("external-link", { size: 12 })}</button>
          </div>
        </div>
        <div class="tree-children" ${open ? "" : 'style="display:none"'}>
          ${(node.children || []).map((c) => treeNodeHtml(c, fullPath)).join("")}
        </div>
      </div>`;
  }
  const badge = node.modified ? '<span class="dot dot-awaiting" title="Modified"></span>' : node.added ? '<span class="dot dot-running" title="Added"></span>' : node.untracked ? '<span class="dot" style="background:var(--color-accent-blue)" title="Untracked"></span>' : "";
  return `
    <div class="tree-row" data-action="open-file" data-path="${fullPath}">
      <span class="chev" style="visibility:hidden">${icon("chevron-right", { size: 13 })}</span>
      ${icon("file", { size: 14 })}
      <span class="truncate">${node.name}</span>
      ${badge}
      <div class="row-actions">
        <button class="btn-icon" data-action="copy-path" data-path="${fullPath}" title="Copy path">${icon("copy", { size: 12 })}</button>
        <button class="btn-icon" data-action="reveal-file" data-path="${fullPath}" title="Reveal in file manager">${icon("external-link", { size: 12 })}</button>
      </div>
    </div>`;
}

function toggleTreePath(path) {
  if (openTreePaths.has(path)) openTreePaths.delete(path);
  else openTreePaths.add(path);
  refreshWorkspace();
}
