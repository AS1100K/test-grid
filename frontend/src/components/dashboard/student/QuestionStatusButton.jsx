import { Button } from "@mui/material";

const STATUS_STYLES = {
  not_attempted: {
    color: "primary",
    variant: "outlined",
    sx: {},
  },
  saved: {
    color: "success",
    variant: "contained",
    sx: {},
  },
  marked_for_review: {
    color: undefined,
    variant: "contained",
    sx: {
      backgroundColor: "purple",
      "&:hover": { backgroundColor: "rebeccapurple" },
    },
  },
};

/**
 * Circular question-status button used in the question grid and the
 * instructions legend.  Pass `onClick` to make it interactive; omit it
 * (or pass `null`) for a purely decorative/legend usage.
 */
export default function QuestionStatusButton({ status, label, onClick }) {
  const { color, variant, sx } = STATUS_STYLES[status] ?? STATUS_STYLES.not_attempted;

  return (
    <Button
      variant={variant}
      color={color}
      onClick={onClick ?? undefined}
      disableRipple={!onClick}
      sx={{
        borderRadius: 999,
        width: 40,
        height: 40,
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
        ...sx,
      }}
    >
      {label ?? "1"}
    </Button>
  );
}
