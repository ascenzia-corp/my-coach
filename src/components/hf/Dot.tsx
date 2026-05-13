export interface HFDotProps {
  color: string;
  size?: number;
}

export function HFDot({ color, size = 7 }: HFDotProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
