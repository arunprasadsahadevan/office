'use client';

import { useState, useTransition } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { updateUserRole } from '@/actions/settings';
import InviteUserDialog from './InviteUserDialog';
import type { UserProfile, Branch, UserRole } from '@/types';

const ROLE_LABELS: Record<UserRole | string, string> = {
  super_admin: 'Super Admin',
  tenant_owner: 'Owner',
  branch_manager: 'Branch Manager',
  cashier: 'Cashier',
  accountant: 'Accountant',
  driver: 'Driver',
};

const EDITABLE_ROLES: UserRole[] = ['tenant_owner', 'branch_manager', 'cashier', 'accountant', 'driver'];

interface Props {
  staff: UserProfile[];
  branches: Branch[];
  currentUserId: string;
}

export default function UserTable({ staff, branches, currentUserId }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleRoleChange(userId: string, role: UserRole) {
    startTransition(async () => {
      await updateUserRole(userId, role);
    });
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteOpen(true)}
          size="small"
        >
          Invite User
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Name / Email</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staff.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No team members yet
                </TableCell>
              </TableRow>
            )}
            {staff.map((member) => {
              const isSelf = member.id === currentUserId;
              const branch = branches.find((b) => b.id === member.branch_id);
              return (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {member.full_name ?? '—'}
                    </Typography>
                    {isSelf && (
                      <Chip label="You" size="small" sx={{ ml: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {branch?.name ?? 'All branches'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {isSelf || member.role === 'super_admin' ? (
                      <Chip label={ROLE_LABELS[member.role] ?? member.role} size="small" variant="outlined" />
                    ) : (
                      <Select
                        value={member.role}
                        size="small"
                        onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                        sx={{ fontSize: '0.8rem', minWidth: 130 }}
                      >
                        {EDITABLE_ROLES.map((r) => (
                          <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(member.created_at).toLocaleDateString('en-KW', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        branches={branches}
      />
    </Box>
  );
}
