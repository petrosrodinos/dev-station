const MOCK_DIFF = [
  { type: "hunk", text: "@@ -14,6 +14,7 @@ export class AuthService {" },
  { type: "ctx", ln: 14, text: "  constructor(private jwt: JwtService) {}" },
  { type: "ctx", ln: 15, text: "" },
  { type: "del", ln: 16, text: "-  async login(dto: LoginDto) {" },
  { type: "add", ln: 16, text: "+  async login(dto: LoginDto, returnTo?: string) {" },
  { type: "ctx", ln: 17, text: "    const user = await this.validate(dto);" },
  { type: "add", ln: 18, text: "+    if (returnTo) this.cache.set(`returnTo:${user.id}`, returnTo);" },
  { type: "ctx", ln: 19, text: "    return this.issueTokens(user);" },
  { type: "ctx", ln: 20, text: "  }" },
];

function renderGit(proj) {
  const files = proj.git.files;
  return `
    <div class="git-toolbar">
      <span class="branch-chip">${icon("git-branch", { size: 14 })} ${proj.branch}</span>
      <button class="btn btn-secondary btn-sm" data-action="git-fetch">${icon("refresh-cw", { size: 13 })} Fetch</button>
      <button class="btn btn-secondary btn-sm" data-action="git-pull">${icon("arrow-down", { size: 13 })} Pull ${proj.git.behind ? `<span class="badge badge-blue">${proj.git.behind}</span>` : ""}</button>
      <button class="btn btn-secondary btn-sm" data-action="git-push">${icon("arrow-up", { size: 13 })} Push ${proj.git.ahead ? `<span class="badge badge-green">${proj.git.ahead}</span>` : ""}</button>
      <button class="btn btn-secondary btn-sm" data-action="git-switch-branch">${icon("arrow-down-up", { size: 13 })} Switch branch</button>
      <button class="btn btn-secondary btn-sm" data-action="git-new-branch">${icon("plus", { size: 13 })} New branch</button>
      <span style="margin-left:auto;display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" data-action="git-stash" ${files.length ? "" : "disabled"}>Stash</button>
        <button class="btn btn-destructive btn-sm" data-action="git-discard" ${files.length ? "" : "disabled"}>Discard all</button>
      </span>
    </div>

    <div class="grid-2" style="align-items:start;">
      <div class="card">
        <div class="card-header">
          <span>Changed files (${files.length})</span>
        </div>
        <div class="file-list">
          ${files.length ? files.map((f) => fileRowHtml(f, proj)).join("") : `<div class="empty-state">${icon("git-commit", { size: 28 })}<div>Working tree clean</div></div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span>Diff ${Store.state.selectedFilePath ? `· <span class="mono text-mute">${Store.state.selectedFilePath}</span>` : ""}</span></div>
        <div class="card-body">
          ${Store.state.selectedFilePath ? diffViewerHtml() : `<div class="empty-state" style="padding:32px 0;">${icon("code", { size: 28 })}<div>Select a file to preview its diff</div></div>`}
        </div>
      </div>
    </div>

    ${files.length ? `
    <div class="card commit-box">
      <div class="card-body">
        <textarea class="textarea" id="commit-message" rows="2" placeholder="Commit message"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
          <button class="btn btn-secondary" data-action="git-discard">Discard all</button>
          <button class="btn btn-primary" data-action="git-commit">${icon("git-commit", { size: 14 })} Commit ${files.length} file${files.length > 1 ? "s" : ""}</button>
        </div>
      </div>
    </div>` : ""}
  `;
}

function fileRowHtml(f, proj) {
  const selected = Store.state.selectedFilePath === f.path;
  return `
    <div class="file-row ${selected ? "selected" : ""}" data-action="select-file" data-path="${f.path}">
      <span class="file-status-tag ${f.status}">${f.status}</span>
      <span class="file-path">${f.path}</span>
      <span class="file-diffstat"><span class="diffstat-add">+${f.add}</span> <span class="diffstat-del">-${f.del}</span></span>
    </div>`;
}

function diffViewerHtml() {
  return `<div class="diff-viewer">${MOCK_DIFF.map(
    (l) => `<div class="diff-line ${l.type}">${l.ln ? `<span class="ln">${l.ln}</span>` : `<span class="ln"></span>`}${escapeHtml(l.text)}</div>`
  ).join("")}</div>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
