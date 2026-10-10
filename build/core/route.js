const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

export function createRoute() {
  let actor = null;
  const route = Object.assign([], {
    target: null,
    goal: null,
    reached: true,
    active: false,
    version: 0,
    interrupted: null,
    bind(a) { actor = a; route.clear(); },
    clear() {
      route.length = 0;
      route.active = false;
      route.goal = null;
      route.version++;
    },
    set(cells, target = cells[cells.length - 1], reached = true) {
      if (!actor) return false;
      actor.setPath(cells);
      return route.follow(target, reached);
    },
    follow(target = null, reached = true) {
      route.length = 0;
      route.target = target ? [target[0], target[1]] : null;
      route.reached = reached;
      route.interrupted = null;
      if (actor) {
        route.push([actor.cell[0], actor.cell[1]]);
        for (const c of actor.path) route.push([c[0], c[1]]);
      }
      route.active = route.length > 1;
      route.goal = route[route.length - 1] || null;
      route.version++;
      return route.active;
    },
    ahead() { return actor ? route.length - actor.path.length : route.length; },
    interrupt(cell) {
      if (!route.active || !actor) return false;
      let k = -1;
      for (let i = Math.max(0, route.ahead()); i < route.length; i++) if (same(route[i], cell)) { k = i; break; }
      if (k < 0) return false;
      actor.path.length -= route.length - 1 - k;
      route.length = k + 1;
      route.goal = route[k];
      route.interrupted = [cell[0], cell[1]];
      route.version++;
      return true;
    },
    cancel() {
      if (!route.active || !actor) return false;
      if (actor.path.length > 1) actor.path.length = 1;
      route.clear();
      return true;
    },
    update() {
      if (!route.active || !actor) return;
      const p = actor.path;
      if (actor.locked || !p.length || !same(p[p.length - 1], route.goal) || p.length > route.length - 1) { route.active = false; route.version++; }
    },
  });
  return route;
}
