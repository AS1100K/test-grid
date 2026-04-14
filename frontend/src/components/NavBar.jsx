import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import useAuth from "../contexts/useAuth";

export default function NavBar() {
  const { token, user, logout } = useAuth();

  if (!token) {
    return <></>;
  }

  return (
    <>
      <AppBar
        position="fixed"
        elevation={2}
        sx={{
          background:
            "linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: "70px",
            }}
          >
            {/* Brand / Logo */}
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
              component="a"
              href="/"
            >
              <Box
                component="img"
                src="/favicon.svg"
                alt="Test Grid"
                sx={{
                  width: 36,
                  height: 36,
                  filter: "drop-shadow(0 0 6px rgba(148, 163, 184, 0.5))",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  ml: 0.5,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: "rgb(226, 232, 240)",
                }}
              >
                Test Grid
              </Typography>
            </Box>

            {/* Right-side actions */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {user?.role === "super_admin" && (
                <Button
                  variant="outlined"
                  href="/new-user"
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    px: 2.5,
                    py: 0.7,
                    fontWeight: 500,
                    borderColor: "rgba(148, 163, 184, 0.7)",
                    color: "rgb(226, 232, 240)",
                    "&:hover": {
                      borderColor: "rgb(248, 250, 252)",
                      backgroundColor: "rgba(148, 163, 184, 0.2)",
                    },
                  }}
                >
                  <AddIcon />
                  New User
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={logout}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  px: 2.5,
                  py: 0.7,
                  fontWeight: 500,
                  borderColor: "rgba(148, 163, 184, 0.7)",
                  color: "rgb(226, 232, 240)",
                  "&:hover": {
                    borderColor: "rgb(248, 250, 252)",
                    backgroundColor: "rgba(148, 163, 184, 0.2)",
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Spacer to offset fixed AppBar */}
      <Box sx={{ mb: "80px" }} />
    </>
  );
}
