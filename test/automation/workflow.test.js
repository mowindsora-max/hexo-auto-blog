const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const yaml = require("js-yaml");

const workflowPath = path.resolve(__dirname, "../../.github/workflows/daily-blog.yml");

test("daily blog workflow deploys generated Hexo output to GitHub Pages", () => {
  const workflow = yaml.load(fs.readFileSync(workflowPath, "utf8"));
  const triggers = workflow.on || workflow.true;

  assert.equal(workflow.name, "Daily Image Blog");
  assert.ok(triggers.schedule);
  assert.deepEqual(triggers.workflow_dispatch, {});
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.permissions.pages, "write");
  assert.equal(workflow.permissions["id-token"], "write");

  const buildSteps = workflow.jobs.build.steps;
  const deploySteps = workflow.jobs.deploy.steps;
  const stepText = JSON.stringify([...buildSteps, ...deploySteps]);

  assert.match(stepText, /actions\/checkout@v/);
  assert.match(stepText, /actions\/setup-node@v4/);
  assert.match(stepText, /npm ci/);
  assert.match(stepText, /npm run daily/);
  assert.match(stepText, /npm run build/);
  assert.match(stepText, /npm run validate/);
  assert.match(stepText, /actions\/upload-pages-artifact@v/);
  assert.match(stepText, /actions\/deploy-pages@v/);
});
