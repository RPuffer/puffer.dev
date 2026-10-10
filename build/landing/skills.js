export const PERSON = { name: "Ryne Puffer", cls: "Jack of All Trades", level: 10, origin: "Milwaukee", now: "SDE II, AWS API Gateway", gift: "Violin" };

export const CLUSTERS = [
  { id: "agentwright", name: "Agentwright", line: "AI-assisted engineering and agent orchestration", thumb: "wizard-medium", hue: "#12c4f0", skills: [
    ["Agent platforms", "Founded his team's AI coding agent framework: 11 agents, 14 skills, 7 procedures from six engineers."],
    ["Guardrails", "Wrote the hook that keeps cloud and credential commands out of an agent's shell. The team runs agents unattended because of it."],
    ["Spec to agent", "Turned certificate rotation into an 11-step spec an AI implementation runs unattended across 40-plus certificates."],
    ["Creative pipelines", "This world: Gemini image generation, procedural layout loops and headless QA that screenshots every island."]] },
  { id: "pagertamer", name: "Pager Tamer", line: "Reliability and observability", thumb: "ember-subject", hue: "#e8873a", skills: [
    ["Load reduction", "Owned an eight-workstream program that cut critical tickets per week on the ingress stack by about 43 percent."],
    ["Alarm design", "Checked every threshold change against historical tickets, and paired each relaxation with a slow-burn alarm."],
    ["Root cause", "Traced false heartbeat pages to a deregistration loop that ran for hours without emitting metrics."],
    ["Deployment math", "Proved a six-host fleet at 75 percent minimum healthy could never deploy after one failure, then fixed it."]] },
  { id: "gatekeeper", name: "Gatekeeper", line: "Edge security and resilience", thumb: "dragon-medium", hue: "#e86aa0", skills: [
    ["Threat research", "Closed a WebSocket denial-of-service hole open since the service launched, with almost no incident history to work from."],
    ["Zero collateral", "Found the accounts already over the new limits before rollout. No real customer got cut off."],
    ["Attack surface", "Found every port on a termination fleet open to the internet and raised it with the attack path written out."],
    ["Self-healing", "Designed the rule that terminates hosts with anomalous connection counts, and argued it past a static threshold."]] },
  { id: "fleetwright", name: "Fleetwright", line: "Platform engineering and developer experience", thumb: "eagle-composition", hue: "#7cc56a", skills: [
    ["Partition launches", "Took a new canary fleet from one partition to four, post-quantum TLS policy included."],
    ["Region builds", "Launched Lambda concurrency control in three new regions and wrote the deployment template used worldwide."],
    ["Canaries", "His Rust canary caught launch-critical bugs before a fixed conference deadline."],
    ["Migrations with proof", "Moved service traffic onto internal load balancers; his load tests showed the latency spikes were an artifact."]] },
  { id: "polyglot", name: "Polyglot Builder", line: "Full-stack product engineering", thumb: "chimera-medium", hue: "#f5c243", skills: [
    ["Modernization", "Moved Java Struts apps onto Node and React, in containers on Kubernetes and AWS."],
    ["Fast ramp", "Shipped production Ruby and GraphQL inside a month at Dutchie; promoted to Senior inside a year."],
    ["Product sense", "Shaped the frameworks, data model and architecture of Dutchie's greenfield Brand Portal."],
    ["Bridges", "Built a digital disability claims experience on Node, talking to legacy IBM DB2 and MQ."]] },
  { id: "studio", name: "Studio of One", line: "Art, music and code in one person", thumb: "cosmos-frisket", hue: "#9a7ae0", skills: [
    ["Ten media", "Ink crosshatch, acrylic, cosmic airbrush, pencil, charcoal, digital, calligraphic ink, cartoon, vector."],
    ["Violin to EDM", "Classically trained violinist. Self-taught guitar, drums and production; releases EDM as orva."],
    ["World building", "Twelve of his artworks became the twelve islands of this three.js world."],
    ["Shown", "Portfolio on Behance as SyntheticFlow; official RAW artist."]] },
];

export const TOP = ["AI agent orchestration and guardrails", "Reliability engineering and alarm design", "Edge security and DDoS resilience", "Platform engineering and developer experience", "Creative technology: art, music and code", "Legacy modernization and full-stack delivery", "Root cause analysis under thin data", "Multi-region and multi-partition launches", "Fast ramp in unfamiliar stacks", "Product sense on greenfield builds"];

export const thumb = (id) => `../assets/start/${id}.jpg`;
