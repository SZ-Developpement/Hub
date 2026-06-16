import { ComponentPropsWithRef } from "react";

export const Icon = (
  props: ComponentPropsWithRef<"svg"> & { size?: number; color?: string },
) => {
  return (
    <svg
      width={props.size || 634}
      height={props.size || 634}
      viewBox="0 0 634 634"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M317 0L43.0228 229.851V337.12L197.144 207.827L42 634L159.381 551.822L317 118.856L425.605 417.188L316.973 341.147L251.793 395.831L592 634L436.856 207.827L590.977 337.12V229.851L317 0Z"
        fill={props.color || "currentColor"}
      />
    </svg>
  );
};
