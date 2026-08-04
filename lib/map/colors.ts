export type MapMember = {
  id: string;
  displayName: string;
  color: string;
};

export type FamilyVisitMap = {
  members: MapMember[];
  /** memberId → country codes */
  visitedByMember: Record<string, string[]>;
  /** countryCode → visitors */
  visitorsByCountry: Record<string, MapMember[]>;
  anyoneCodes: string[];
  anyoneCount: number;
};

export type MapViewMode = "anyone" | "individual" | "couple" | "family";

export type MapColorOptions = {
  mode: MapViewMode;
  memberId?: string | null;
  coupleMemberIds?: [string, string] | null;
  colors?: {
    anyone: string;
    shared: string;
    family: string;
    unvisited: string;
  };
};

const DEFAULT_COLORS = {
  anyone: "#2F6F6A",
  shared: "#C4875A",
  family: "#4A7C8C",
  unvisited: "#E6E0D4",
};

function intersect(sets: string[][]): Set<string> {
  if (sets.length === 0) return new Set();
  let result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const next = new Set(sets[i]);
    result = new Set([...result].filter((code) => next.has(code)));
  }
  return result;
}

/** Returns fill color per country code for the active map mode. */
export function getMapColorByCountry(
  visitMap: FamilyVisitMap,
  options: MapColorOptions,
): Record<string, string> {
  const colors = { ...DEFAULT_COLORS, ...options.colors };
  const result: Record<string, string> = {};

  const paint = (codes: Iterable<string>, color: string) => {
    for (const code of codes) result[code] = color;
  };

  if (options.mode === "anyone") {
    for (const [code, visitors] of Object.entries(visitMap.visitorsByCountry)) {
      result[code] =
        visitors.length === 1 ? visitors[0].color : colors.anyone;
    }
    return result;
  }

  if (options.mode === "individual") {
    const memberId = options.memberId ?? visitMap.members[0]?.id;
    const member = visitMap.members.find((m) => m.id === memberId);
    if (member) {
      paint(visitMap.visitedByMember[member.id] ?? [], member.color);
    }
    return result;
  }

  if (options.mode === "couple") {
    const pair =
      options.coupleMemberIds ??
      (visitMap.members.length >= 2
        ? ([visitMap.members[0].id, visitMap.members[1].id] as [
            string,
            string,
          ])
        : null);
    if (!pair) return result;
    const shared = intersect([
      visitMap.visitedByMember[pair[0]] ?? [],
      visitMap.visitedByMember[pair[1]] ?? [],
    ]);
    paint(shared, colors.shared);
    return result;
  }

  if (visitMap.members.length === 0) return result;
  const all = intersect(
    visitMap.members.map((m) => visitMap.visitedByMember[m.id] ?? []),
  );
  paint(all, colors.family);
  return result;
}

export function countColoredCountries(colors: Record<string, string>) {
  return Object.keys(colors).length;
}

export function modeLegendLabel(mode: MapViewMode) {
  switch (mode) {
    case "anyone":
      return "Countries visited by at least one family member";
    case "individual":
      return "Countries visited by the selected member";
    case "couple":
      return "Countries visited by both selected members";
    case "family":
      return "Countries visited by every family member";
  }
}
