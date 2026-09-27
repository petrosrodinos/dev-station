const ISSUE_FIELDS = `
  id identifier title description priority priorityLabel url createdAt updatedAt
  state { id name type color }
  assignee { id name avatarUrl }
  labels { nodes { id name color } }
  team { id key name }
  project { id name }
`;

export const LINEAR_VIEWER_QUERY = `query { viewer { id name email } organization { name } }`;

export const LINEAR_TEAMS_QUERY = `query { teams(first: 100) { nodes { id key name } } }`;

export const LINEAR_PROJECTS_QUERY = `query Projects($filter: ProjectFilter) { projects(first: 100, filter: $filter) { nodes { id name state } } }`;

export const LINEAR_ISSUES_QUERY = `query Issues($filter: IssueFilter, $first: Int) {
  issues(filter: $filter, first: $first, orderBy: updatedAt) { nodes { ${ISSUE_FIELDS} } }
}`;

export const LINEAR_ISSUE_QUERY = `query Issue($id: String!) {
  issue(id: $id) { ${ISSUE_FIELDS} comments(first: 50) { nodes { id body createdAt user { id name avatarUrl } } } }
}`;
