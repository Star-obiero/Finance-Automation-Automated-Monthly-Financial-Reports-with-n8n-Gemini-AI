// Runs the workflow's two Code nodes locally on sample data (no n8n needed) and writes a preview.
const fs = require("fs");
const wf = JSON.parse(fs.readFileSync(__dirname + "/../workflow/finance-automation.json", "utf8"));
const code = n => wf.nodes.find(x => x.name === n).parameters.jsCode;

const [head, ...lines] = fs.readFileSync(__dirname + "/../sample-data/transactions_sample.csv", "utf8").trim().split(/\r?\n/);
const keys = head.split(",");
const rows = lines.map(l => { const c = l.split(","); return Object.fromEntries(keys.map((k, i) => [k, c[i]])); });

const run = (src, ctx) => new Function("$input", "$", src)(ctx.$input, ctx.$);
const metrics = run(code("Calculate Metrics"), { $input: { all: () => rows.map(json => ({ json })) } })[0].json;

const gemini = { candidates: [{ content: { parts: [{ text:
`## Summary
Total income was well above total expenses, leaving a healthy net saving for the period.

## Where the money went
Rent and education were the largest expense categories, together making up most of spending.

## 3 Recommended actions
- Keep rent below one third of income to protect your savings rate.
- Review the largest single expense and decide if it can be reduced or spread out.
- Move part of the monthly surplus into a separate savings or investment account.` }] } }] };

const email = run(code("Build Email HTML"), {
  $input: { first: () => ({ json: gemini }) },
  $: () => ({ first: () => ({ json: metrics }) }) })[0].json;

fs.writeFileSync("/tmp/metrics.json", JSON.stringify(metrics));
fs.writeFileSync("/tmp/email.html", email.html);
console.log(email.subject, "| valid rows:", metrics.validRowCount, "| invalid:", metrics.invalidRowCount, JSON.stringify(metrics.issues));
