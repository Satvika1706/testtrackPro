import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  getAdminUsers,
  getRoleSummaries,
  updateAdminUserRole,
  type AdminRole,
  type AdminUser,
  type RoleSummary,
} from "../api/admin.api";

const ManageRolesPage = () => {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedRole, setSelectedRole] = useState<AdminRole>("TESTER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const [roleData, userData] = await Promise.all([getRoleSummaries(), getAdminUsers()]);
      setRoles(roleData);
      setUsers(userData);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load role data");
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const userOptions = useMemo(() => users.map((u) => ({ id: u.id, email: u.email })), [users]);

  const handleAssignRole = async () => {
    if (selectedUserId === "") return;
    setError("");
    setSuccess("");
    try {
      await updateAdminUserRole(Number(selectedUserId), selectedRole);
      setSuccess("Role updated successfully");
      void loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to assign role");
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 3 }}>
        Manage Roles
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Assign Role to User
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel id="assign-user-label">User</InputLabel>
            <Select
              labelId="assign-user-label"
              label="User"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value as number | "")}
            >
              <MenuItem value="">Select user</MenuItem>
              {userOptions.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="assign-role-label">Role</InputLabel>
            <Select
              labelId="assign-role-label"
              label="Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
            >
              {roles.map((role) => (
                <MenuItem key={role.role} value={role.role}>
                  {role.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="contained" onClick={() => void handleAssignRole()}>
            Assign
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Users</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.role} hover>
                <TableCell>{role.role}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>{role.userCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ManageRolesPage;
