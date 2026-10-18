import { useId, useState, type ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "above" | "below";
}

export function Tooltip({ content, children, position = "above" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="tooltip-wrapper"
      tabIndex={0}
      aria-describedby={visible ? id : undefined}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span role="tooltip" id={id} className={`tooltip-bubble${position === "below" ? " below" : ""}`}>
          {content}
        </span>
      )}
    </span>
  );
}
