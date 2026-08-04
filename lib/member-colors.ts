export const MEMBER_COLORS = [
  "#2F6F6A", // deep teal
  "#C4875A", // warm clay
  "#6B8F71", // sage
  "#8B6F8A", // muted mauve
  "#4A7C8C", // ocean
  "#B08968", // sand
] as const;

export function nextMemberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
