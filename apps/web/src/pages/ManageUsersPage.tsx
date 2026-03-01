import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  createAdminUser,
  getAdminUsers,
  updateAdminUser,
  type AdminRole,
  type AdminUser,
} from "../api/admin.api";

const roles: AdminRole[] = ["TESTER", "DEVELOPER", "TRIAGE", "ADMIN"];

const ManageUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showDeactivated, setShowDeactivated] = useState("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("TESTER");

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getAdminUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        isDeactivated:
          showDeactivated === "all"
            ? undefined
            : showDeactivated === "deactivated"
            ? "true"
            : "false",
      });
      setUsers(result);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;
    try {
      await createAdminUser({
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setNewEmail("");
      setNewPassword("");
      setNewRole("TESTER");
      void loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create user");
    }
  };

  const handleRoleChange = async (userId: number, role: AdminRole) => {
    try {
      await updateAdminUser(userId, { role });
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update role");
    }
  };

  const handleToggleDeactivation = async (userId: number, isDeactivated: boolean) => {
    try {
      await updateAdminUser(userId, { isDeactivated: !isDeactivated });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isDeactivated: !isDeactivated } : user
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update activation status");
    }
  };

  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => !u.isDeactivated).length;
    const deactivated = total - active;
    return { total, active, deactivated };
  }, [users]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 3 }}>
        Manage Users
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField
            label="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="role-filter-label">Role</InputLabel>
            <Select
              labelId="role-filter-label"
              label="Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="state-filter-label">User State</InputLabel>
            <Select
              labelId="state-filter-label"
              label="User State"
              value={showDeactivated}
              onChange={(e) => setShowDeactivated(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="deactivated">Deactivated</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => void loadUsers()} disabled={isLoading}>
            {isLoading ? "Loading..." : "Apply"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Create User
        </Typography>
        <Stack spacing={2}>
          <TextField label="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} fullWidth />
          <TextField
            label="Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="new-role-label">Role</InputLabel>
            <Select
              labelId="new-role-label"
              label="Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AdminRole)}
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => void handleCreateUser()}>
            Create User
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={`Total: ${summary.total}`} />
        <Chip label={`Active: ${summary.active}`} color="success" />
        <Chip label={`Deactivated: ${summary.deactivated}`} color="warning" />
      </Stack>

      <Paper sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Verified</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={user.role}
                      onChange={(e) => void handleRoleChange(user.id, e.target.value as AdminRole)}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={user.isEmailVerified ? "success" : "warning"}
                    variant="outlined"
                    label={user.isEmailVerified ? "Verified" : "Not verified"}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      color={user.isDeactivated ? "warning" : "success"}
                      label={user.isDeactivated ? "Deactivated" : "Active"}
                    />
                    <Switch
                      checked={!user.isDeactivated}
                      onChange={() => void handleToggleDeactivation(user.id, user.isDeactivated)}
                    />
                  </Stack>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ManageUsersPage;
